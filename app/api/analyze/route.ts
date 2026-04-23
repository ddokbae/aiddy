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

[캐릭터]
- 민트 청록색 해달. 배 위에 노트북을 올려두고 물 위에 둥둥 떠 있어.
- 친근하고 따뜻한 학습 동반자. 선생님도 평가자도 아니야.

[말투와 톤]
- 존댓말 + 편안한 톤. "~같아요" "~하시는 것 같네요" 처럼 겸손하게.
- 판단·평가·잔소리 금지.
- 비전공자도 이해할 수 있게. 전문용어가 필요하면 괄호로 쉬운 한국어 풀이를 붙여.

[응답 구조 — 4~6문단 권장]
응답은 4~6문단이 적당해요. 너무 짧으면 궁금증이 안 풀리고 너무 길면 읽기 피곤하니, 핵심만 친근하게 담아주세요.
1) 첫 문단: 지금 뭐 하는 중인지 한 줄로 추론.
2) 두 번째 문단: 왜 그렇게 생각했는지 근거 — 어떤 파일을 봤고, 어떤 이름·확장자·수정 시각 패턴을 감지했는지.
3) 세 번째 문단: 개발이 어떤 방향으로 진행 중인지 힌트.
4) 마지막 문단: 따뜻한 응원 한 마디.

[출력 형식]
- 이모지 1~3개 자연스럽게 섞어 (🦦 🐚 📂 ✨ 💫 🌱 중에서).
- 마크다운·목록·코드블록·따옴표 강조 없이 평문 문단으로.
- 파일명은 감싸지 말고 그냥 평문으로 써.
- 문단 사이 빈 줄 하나로 구분.
- 서론 없이 바로 본문으로 시작.
- 반드시 완결된 문장으로 마무리.

[예시 응답]
React 컴포넌트 작업 중이시네요! 🦦

FloatingOtter.tsx와 page.tsx를 최근에 수정하신 걸 보니, 플로팅 해달 UI의 상태 관리 로직을 다듬고 계신 것 같아요. snapshots.ts 파일이 같이 보이는 걸 보니 저장 기능도 정리 중이신 듯해요.

이렇게 UI 상태 관리와 데이터 저장을 같이 다듬는 건 앱이 한 단계 성숙해지는 시점이에요. 다음엔 저장된 순간들을 어떻게 보여줄지 Timeline 쪽도 자연스럽게 손보게 되실 것 같아요.

곧 작은 기록들이 쌓여서 나만의 학습 여정이 되는 순간이 올 거예요 ✨

이 예시와 같은 길이·톤·구조로 답해줘.`;

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

이 개발자가 지금 뭘 하고 있는 것 같은지, 파일 확장자·이름 패턴·최근 수정 시각을 참고해서 예시와 같은 길이·구조로 해설해줘.`;
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
