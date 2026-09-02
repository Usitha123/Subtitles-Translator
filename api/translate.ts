import { GoogleGenAI, Type } from "@google/genai";

const FREE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.7-flash",
];

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

export default async function handler(req: any, res: any) {
  // Support CORS if needed
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.",
      });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    let rawItems: any[] = [];
    let settings: any = {};

    if (Array.isArray(body)) {
      rawItems = body;
    } else if (body && typeof body === "object") {
      rawItems = body.subtitles || body.items || [];
      settings = body.settings || {};
    }

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res
        .status(400)
        .json({ error: "No subtitles provided in request body." });
    }

    const cleanSubtitles = rawItems.map((item: any) => ({
      id: Number(item.id),
      text: String(item.text || ""),
    }));

    const rawContextPrev = body?.contextPrev || [];
    const rawContextNext = body?.contextNext || [];

    const cleanContextPrev = Array.isArray(rawContextPrev)
      ? rawContextPrev.map((item: any) => ({
          id: Number(item.id),
          text: String(item.text || ""),
        }))
      : [];

    const cleanContextNext = Array.isArray(rawContextNext)
      ? rawContextNext.map((item: any) => ({
          id: Number(item.id),
          text: String(item.text || ""),
        }))
      : [];

    const stylePrompt =
      settings?.style === "colloquial"
        ? "Style: Natural spoken Sri Lankan Sinhala dialogue (ස්වාභාවික කථා බහ භාෂාව). Use authentic, fluent Sri Lankan conversational phrasing as spoken in high-quality movies, cinema dubbing, and teledramas."
        : settings?.style === "formal"
        ? "Style: Formal/Written Sinhala (ලිඛිත සිංහල). Use standard written grammar and formal vocabulary appropriate for documentaries, news, or literary broadcasts."
        : "Style: Natural, everyday Sri Lankan dialogue.";

    let glossaryPrompt = "";
    if (
      settings?.glossary &&
      Array.isArray(settings.glossary) &&
      settings.glossary.length > 0
    ) {
      const terms = settings.glossary
        .map(
          (g: { source: string; target: string }) =>
            `"${g.source}" -> "${g.target}"`
        )
        .join(", ");
      glossaryPrompt = `\nCustom Term Glossary (strictly enforce):\n${terms}`;
    }

    let extraInstructions = "";
    if (settings?.customInstructions?.trim()) {
      extraInstructions = `\nAdditional Custom Rules:\n${settings.customInstructions.trim()}`;
    }

    let contextRule = "";
    if (cleanContextPrev.length > 0 || cleanContextNext.length > 0) {
      contextRule = `
CONTEXT-AWARE TRANSLATION RULES:
- You are provided with CONTEXT subtitles (surrounding dialogue) marked clearly as 'CONTEXT (PREVIOUS DIALOGUE)' and 'CONTEXT (NEXT DIALOGUE)' to help you understand conversation flow, speaker tone, and pronouns.
- CRITICAL: You MUST ONLY translate the TARGET subtitles (marked as 'TARGET SUBTITLES TO TRANSLATE').
- CRITICAL: NEVER translate, modify, or return any CONTEXT subtitles.
- CRITICAL: Output JSON array MUST contain translations ONLY for the TARGET subtitle IDs (${cleanSubtitles.map((s) => s.id).join(", ")}). Do NOT include CONTEXT subtitle IDs in the output.`;
    }

    const systemInstruction = `You are an expert English to Sri Lankan Sinhala subtitle translator specializing in movie and TV subtitle localization.
Your task is to translate English subtitle dialogue into natural, spoken Sri Lankan Sinhala.

${stylePrompt}
${glossaryPrompt}
${extraInstructions}
${contextRule}

TRANSLATION RULES:
1. Translate English dialogue into natural spoken Sinhala.
2. Prioritize meaning over word-for-word translation.
3. Preserve the character's emotion.
4. Preserve the character's personality.
5. Use natural Sri Lankan Sinhala.
6. Avoid unnecessarily formal Sinhala.
7. Do not add information.
8. Do not explain the translation.
9. Do not include the original English.
10. Do not transliterate English into Sinhala unless appropriate for a proper name.
11. Preserve names.
12. Preserve numbers.
13. Preserve URLs.
14. Preserve HTML subtitle tags (e.g. <i>, </i>, <b>, </b>).
15. Preserve musical symbols such as ♪ and ♫.
16. Preserve subtitle line breaks when practical.
17. Never modify subtitle IDs.
18. Never modify timestamps.
19. Never merge subtitles.
20. Never split subtitles.

OUTPUT FORMAT REQUIREMENTS:
- Return ONLY the requested JSON structure with a 'translations' array.
- Each item MUST contain 'id' (number matching input TARGET subtitle) and 'text' (string containing the Sinhala translation).`;

    let contentsPrompt = "";
    if (cleanContextPrev.length > 0 || cleanContextNext.length > 0) {
      contentsPrompt = `You are translating English movie/TV subtitles into Sinhala.\n\n`;

      if (cleanContextPrev.length > 0) {
        contentsPrompt +=
          `--- CONTEXT (PREVIOUS DIALOGUE - DO NOT TRANSLATE) ---\n` +
          JSON.stringify(cleanContextPrev, null, 2) +
          `\n\n`;
      }

      contentsPrompt +=
        `--- TARGET SUBTITLES TO TRANSLATE (ONLY TRANSLATE THESE ${cleanSubtitles.length} LINES) ---\n` +
        JSON.stringify(cleanSubtitles, null, 2) +
        `\n\n`;

      if (cleanContextNext.length > 0) {
        contentsPrompt +=
          `--- CONTEXT (NEXT DIALOGUE - DO NOT TRANSLATE) ---\n` +
          JSON.stringify(cleanContextNext, null, 2) +
          `\n\n`;
      }

      contentsPrompt += `Translate ONLY the TARGET subtitles into Sinhala and return the JSON object with the 'translations' array. Do NOT include CONTEXT subtitles in the output.`;
    } else {
      contentsPrompt =
        `Translate the following ${cleanSubtitles.length} TARGET subtitle lines into Sinhala:\n` +
        JSON.stringify(cleanSubtitles);
    }

    const ai = getGenAI();
    let responseText = "";
    let lastErr: any = null;

    for (const modelName of FREE_MODELS) {
      try {
        console.log(`[Translate API] Attempting translation using free model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.NUMBER },
                      text: { type: Type.STRING },
                    },
                    required: ["id", "text"],
                  },
                },
              },
              required: ["translations"],
            },
          },
        });
        responseText = response.text || "{}";
        lastErr = null;
        break;
      } catch (mErr: any) {
        lastErr = mErr;
        const errMsg = String(mErr?.message || mErr || "");
        console.warn(`[Translate API] Model '${modelName}' call failed:`, errMsg);

        const isAuthError =
          errMsg.includes("401") ||
          errMsg.includes("UNAUTHENTICATED") ||
          errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
          errMsg.includes("API_KEY_INVALID") ||
          errMsg.includes("API key not valid");

        if (isAuthError) {
          return res.status(401).json({
            error:
              "Gemini API authentication failed. Please ensure a valid API key starting with 'AIzaSy...' is set in GEMINI_API_KEY.",
          });
        }

        const isFatal =
          errMsg.includes("400") ||
          errMsg.includes("INVALID_ARGUMENT") ||
          errMsg.includes("PERMISSION_DENIED");

        if (isFatal) {
          break;
        }

        continue;
      }
    }

    if (lastErr && !responseText) {
      const errMsg = String(lastErr?.message || lastErr || "");
      const isTemporary =
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("Quota exceeded") ||
        errMsg.includes("rate-limits") ||
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand") ||
        errMsg.includes("temporary");

      if (isTemporary) {
        const matchSecs =
          errMsg.match(/retry in ([\d.]+)s/i) ||
          errMsg.match(/retryDelay"?:\s*"(\d+)s"/i);
        let waitSecs = 10;
        if (matchSecs && matchSecs[1]) {
          const parsedVal = Math.ceil(parseFloat(matchSecs[1]));
          if (parsedVal > 0) waitSecs = parsedVal;
        }
        return res.status(503).json({
          error: `Gemini API is busy or experiencing high demand. Retrying in ${waitSecs}s...`,
          retryAfterSeconds: waitSecs,
        });
      }

      return res.status(500).json({
        error: errMsg || "Failed to generate subtitle translations.",
      });
    }

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResult = JSON.parse(match[0]);
      } else {
        throw new Error("Invalid JSON returned by translation model");
      }
    }

    return res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Translation error:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error during translation.",
    });
  }
}
