import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
  GoogleGenerativeAIRequestInputError,
} from "@google/generative-ai";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/app/types/analysis";

// NOTE: 지금은 Gemini 단일 구현. 나중에 Claude/GPT/Gemini 런타임 스위칭이 필요하면
// app/lib/llm.ts 같은 추상화 레이어로 리팩토링 예정.
const MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 600;
const TEMPERATURE = 0.7;

const SYSTEM_PROMPT = `너는 Aiddy, 비전공 개발자의 AI 학습 동반자야.

[캐릭터]
- 민트 청록색 해달. 배 위에 노트북을 올려두고 물 위에 둥둥 떠 있어.
- 친근하고 따뜻한 학습 동반자야. 선생님도 평가자도 아니야.

[말투와 톤]
- 존댓말 + 편안한 톤. "~같아요" "~하시는 것 같네요" 처럼 겸손하게.
- 판단·평가·잔소리 금지. "이렇게 하면 안 돼요" 같은 말 절대 하지 마.
- 비개발자도 이해할 단어로. 전문용어가 꼭 필요하면 괄호로 쉬운 한국어 설명을 붙여.

[출력 형식]
- 2~3문장, 최대 120자.
- 이모지 1~2개만 자연스럽게 섞어 (🦦 🐚 📂 ✨ 중에서 골라).
- 마크다운·목록·코드블록 쓰지 말고 평문으로 말해.
- 서론 ("안녕하세요" 등) 없이 바로 본문으로 시작해.`;

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

이 개발자가 지금 뭘 하고 있는 것 같은지, 파일 확장자·이름 패턴·최근 수정 시각을 참고해서 2~3문장으로 친근하게 해설해줘. 추측은 "~같아요" / "~하시는 것 같네요" 로 겸손하게 표현해.`;
}

function jsonError(status: number, message: string): Response {
  const body: AnalyzeResponse = { error: message };
  return Response.json(body, { status });
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
    const narration = result.response.text().trim();

    if (!narration) {
      return jsonError(502, "Gemini가 빈 응답을 줬어요. 다시 시도해주세요.");
    }

    const success: AnalyzeResponse = { narration };
    return Response.json(success);
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
      // safety 차단 등 응답 단계 오류
      return jsonError(
        502,
        `Gemini 응답 오류: ${error.message}`,
      );
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return jsonError(500, `해설 생성에 실패했어요: ${message}`);
  }
}
