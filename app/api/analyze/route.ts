import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
  GoogleGenerativeAIRequestInputError,
  FinishReason,
} from "@google/generative-ai";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/app/types/analysis";

// NOTE: 지금은 Gemini 단일 구현. 나중에 Claude/GPT/Gemini 런타임 스위칭이 필요하면
// app/lib/llm.ts 같은 추상화 레이어로 리팩토링 예정.
const MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 2048; // 4~6문단 구조화 응답 여유 확보. Gemini 2.5 Flash 는 8192 까지 지원하므로 안전.
const TEMPERATURE = 0.7;

const SAFETY_FALLBACK =
  "해설을 만들다 잠시 머뭇거렸어요. 다시 시도해볼게요 🦦";

const SYSTEM_PROMPT = `너는 Aiddy, 비전공 개발자의 AI 학습 동반자야.

[정체성]
친절한 CS 선생님이야. 가장 중요한 일은 사용자가 지금 다루고 있는 기술·패턴을
이해시키는 거야. 감정적 응원이 아니라 개념 설명이 네 핵심 가치야.

[캐릭터]
- 민트 청록색 해달. 배 위에 노트북을 올려두고 물 위에 둥둥 떠 있어.
- 같이 공부하는 선배 같은 존재 — 평가하지 않고 개념을 풀어 설명해주는 사람.

[말투와 톤]
- 존댓말 + 편안한 톤. "~같아요" "~하시는 것 같네요" 로 추측은 겸손하게 (단정 금지).
- 판단·평가·잔소리 금지.
- 개념 설명할 때 비유·실생활 예시 적극 활용 (예: "API Route는 식당 주문 창구 같은 거예요 — 손님 요청을 주방에 전달해요").
- 전문용어가 나오면 반드시 "이건 ~하는 역할이에요" 식으로 풀어 설명.
- 이미 이해했을 법한 기초 용어(파일, 폴더, 클릭)는 건너뛰고, 중급 개념(API, 상태 관리, 타입 시스템, 컴포넌트, 비동기 등)에 집중.
- 응원·격려는 마지막 한 줄 정도로 최소화 — 감정 토스터가 아니라 학습 도우미임.

[응답 구조 — 4문단]
1) [무엇을 했는가] 지금 작업을 한 줄로 요약.
2) [어떤 기술·패턴인가] 감지된 기술이나 패턴 1~2개를 비전공자 눈높이로 설명. 왜 그 패턴을 쓰는지 이유도 간단히. 이 문단이 가장 길고 중요해.
3) [왜 그렇게 추론했는가] 파일명·수정 시각 근거를 짧게.
4) [다음 학습 포인트] "이런 것도 같이 보면 좋아요" 식 학습 제안. 마지막 한 줄만 따뜻하게 마무리.

[출력 형식]
- 이모지 1~2개만 (🦦 🐚 📂 ✨ 💫 중에서). 학습 도우미니까 감정 이모지로 도배하지 마.
- 마크다운·목록·코드블록 없이 평문 문단으로.
- 파일명·경로는 감싸지 말고 그냥 평문으로 써 (예: app/api/analyze/route.ts).
- 문단 사이 빈 줄 하나로 구분.
- 서론("안녕하세요" 등) 없이 바로 본문으로 시작.
- 반드시 완결된 문장으로 마무리.

[예시 응답]
Next.js API Route를 만드시면서 프론트엔드와 연결하는 작업을 하고 계시네요.

API Route는 Next.js에서 서버 기능을 만드는 방식이에요. app/api/analyze/route.ts 위치에 파일을 두면 자동으로 /api/analyze 라는 주소로 접근할 수 있어요. 식당으로 비유하면 '주문 받는 창구'를 만든 거예요. 프론트엔드(손님)가 이 창구에 데이터를 보내면, route.ts(주방)가 처리해서 결과를 돌려주죠.

FloatingOtter.tsx와 page.tsx도 같이 수정하신 걸 보면 화면에서 이 API를 호출하는 로직을 붙이고 계신 것 같아요.

관련해서 알아두면 좋은 것: API Route는 서버에서 실행되니까 API 키 같은 비밀 정보를 안전하게 넣어둘 수 있어요. 클라이언트(브라우저)에서 직접 호출하면 키가 노출되거든요. 지금 작업이 완성되면 프론트-백엔드 데이터 흐름 한 사이클이 완성되는 거예요 🦦

이 예시와 같은 길이·톤·구조로, 특히 두 번째 문단에서 개념 설명을 충실히 해줘.`;

function buildUserPrompt(req: AnalyzeRequest): string {
  const fileLines = req.recentFiles
    .map((f, i) => {
      const when = new Date(f.lastModified).toISOString();
      return `${i + 1}. ${f.path} (수정: ${when})`;
    })
    .join("\n");

  return `프로젝트 폴더: ${req.folderName}

최근에 수정된 파일 5개:
${fileLines}

이 개발자가 지금 뭘 하고 있는 것 같은지, 어떤 기술·패턴을 다루고 있는지 파일 확장자·이름 패턴·최근 수정 시각을 참고해서 추론해줘. 감지된 핵심 개념을 비전공자 눈높이로 풀어 설명하는 게 최우선이야. 예시와 같은 4문단 구조로 답해.`;
}

function jsonError(status: number, message: string): Response {
  const body: AnalyzeResponse = { error: message };
  return Response.json(body, { status });
}

function jsonNarration(narration: string): Response {
  const body: AnalyzeResponse = { narration };
  return Response.json(body);
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError(
      500,
      "서버에 GEMINI_API_KEY가 설정돼있지 않아요. .env.local 확인해주세요.",
    );
  }

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return jsonError(400, "요청 본문이 JSON이 아니에요.");
  }

  if (!body?.folderName || !Array.isArray(body.recentFiles)) {
    return jsonError(400, "folderName과 recentFiles가 필요해요.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    },
  });

  try {
    const result = await model.generateContent(buildUserPrompt(body));
    const resp = result.response;
    const candidate = resp?.candidates?.[0];
    const finishReason = candidate?.finishReason;

    // Vercel Logs 에서 응답 종료 이유 추적용
    console.log("[analyze] finishReason:", finishReason ?? "undefined");

    // prompt 자체가 차단된 경우 — candidates 가 비어 있음
    if (!candidate || !candidate.content?.parts?.length) {
      console.warn(
        "[analyze] 빈 candidate — safety/empty",
        { promptFeedback: resp?.promptFeedback, finishReason },
      );
      return jsonNarration(SAFETY_FALLBACK);
    }

    const text = candidate.content.parts
      .map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      console.warn("[analyze] parts 있지만 text 비어 있음", { finishReason });
      return jsonNarration(SAFETY_FALLBACK);
    }

    // safety / recitation 차단 — 부분 텍스트가 있어도 fallback
    if (
      finishReason === FinishReason.SAFETY ||
      finishReason === FinishReason.RECITATION
    ) {
      console.warn("[analyze] 응답 차단됨:", finishReason);
      return jsonNarration(SAFETY_FALLBACK);
    }

    if (finishReason === FinishReason.MAX_TOKENS) {
      // 잘렸어도 있는 만큼 돌려줌 — 시스템 프롬프트가 완결 문장을 지시하므로
      // 1200 tokens 안에서 보통 온전히 들어옴
      console.warn("[analyze] MAX_TOKENS 에 걸려 잘렸지만 부분 텍스트 반환");
    }

    return jsonNarration(text);
  } catch (error) {
    if (error instanceof GoogleGenerativeAIFetchError) {
      if (error.status === 429) {
        return jsonError(
          429,
          "Gemini 호출 한도를 잠시 초과했어요. 조금 뒤 다시 시도해주세요.",
        );
      }
      if (error.status === 401 || error.status === 403) {
        return jsonError(401, "GEMINI_API_KEY가 유효하지 않아요.");
      }
      return jsonError(
        error.status ?? 500,
        `Gemini API 오류: ${error.message}`,
      );
    }
    if (error instanceof GoogleGenerativeAIRequestInputError) {
      return jsonError(400, `요청 내용이 잘못됐어요: ${error.message}`);
    }
    if (error instanceof GoogleGenerativeAIResponseError) {
      // response 파싱 단계 에러 — safety 블록이 예외로 올라오는 케이스
      console.warn("[analyze] ResponseError:", error.message);
      return jsonNarration(SAFETY_FALLBACK);
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("[analyze] unexpected:", error);
    return jsonError(500, `해설 생성에 실패했어요: ${message}`);
  }
}
