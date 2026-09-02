import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper for lazy initializing GoogleGenAI client
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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Server-Side Gemini Subtitle Batch Translation Endpoint
  app.post("/api/translate", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            "GEMINI_API_KEY environment variable is not configured on the server.",
        });
      }

      // Flexible payload extraction (array or object containing subtitles)
      let rawItems: any[] = [];
      let settings: any = {};

      if (Array.isArray(req.body)) {
        rawItems = req.body;
      } else if (req.body && typeof req.body === "object") {
        rawItems = req.body.subtitles || req.body.items || [];
        settings = req.body.settings || {};
      }

      if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        return res
          .status(400)
          .json({ error: "No subtitles provided in request body." });
      }

      // Strip timestamps and extra metadata - send strictly ID and text to Gemini
      const cleanSubtitles = rawItems.map((item: any) => ({
        id: Number(item.id),
        text: String(item.text || ""),
      }));

      // Extract optional context items (previous and next surrounding dialogue)
      const rawContextPrev = req.body?.contextPrev || [];
      const rawContextNext = req.body?.contextNext || [];

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

      // Build style & context instructions
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
          contentsPrompt += `--- CONTEXT (PREVIOUS DIALOGUE - DO NOT TRANSLATE) ---\n` +
            JSON.stringify(cleanContextPrev, null, 2) + `\n\n`;
        }

        contentsPrompt += `--- TARGET SUBTITLES TO TRANSLATE (ONLY TRANSLATE THESE ${cleanSubtitles.length} LINES) ---\n` +
          JSON.stringify(cleanSubtitles, null, 2) + `\n\n`;

        if (cleanContextNext.length > 0) {
          contentsPrompt += `--- CONTEXT (NEXT DIALOGUE - DO NOT TRANSLATE) ---\n` +
            JSON.stringify(cleanContextNext, null, 2) + `\n\n`;
        }

        contentsPrompt += `Translate ONLY the TARGET subtitles into Sinhala and return the JSON object with the 'translations' array. Do NOT include CONTEXT subtitles in the output.`;
      } else {
        contentsPrompt = `Translate the following ${cleanSubtitles.length} TARGET subtitle lines into Sinhala:\n` + JSON.stringify(cleanSubtitles);
      }

      const ai = getGenAI();
      const FREE_MODELS = [
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.7-flash",
      ];

      let responseText = "";
      let lastErr: any = null;

      for (const modelName of FREE_MODELS) {
        try {
          console.log(`[Server] Attempting translation using free model: ${modelName}`);
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
          break; // Success with current free model!
        } catch (mErr: any) {
          lastErr = mErr;
          const errMsg = String(mErr?.message || mErr || "");
          console.warn(`[Server] Free model '${modelName}' call failed:`, errMsg);

          const isAuthError =
            errMsg.includes("401") ||
            errMsg.includes("UNAUTHENTICATED") ||
            errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
            errMsg.includes("API_KEY_INVALID") ||
            errMsg.includes("API key not valid");

          if (isAuthError) {
            // Authentication issue with API key — do not continue trying models
            return res.status(401).json({
              error: "Gemini API authentication failed. Please ensure a valid API key starting with 'AIzaSy...' is configured in Settings > Secrets.",
            });
          }

          const isFatal =
            errMsg.includes("400") ||
            errMsg.includes("INVALID_ARGUMENT") ||
            errMsg.includes("PERMISSION_DENIED");

          if (isFatal) {
            break;
          }

          // For 503 (high demand), 429 (rate limit), 404/NOT_FOUND, 500/502/504, try next free model
          console.log(`[Server] Model '${modelName}' encountered temporary issue. Trying next candidate model...`);
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
        throw lastErr;
      }

      let parsedResponse: any;

      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Failed to parse Gemini response JSON:", responseText);
        return res
          .status(500)
          .json({ error: "Failed to parse structured JSON response from Gemini model." });
      }

      // Validate response structure before returning
      if (
        !parsedResponse ||
        typeof parsedResponse !== "object" ||
        !Array.isArray(parsedResponse.translations)
      ) {
        console.error("Invalid response schema from Gemini:", parsedResponse);
        return res.status(422).json({
          error:
            "Response validation failed: model output did not contain a valid translations array.",
        });
      }

      const inputIdsSet = new Set(cleanSubtitles.map((item) => item.id));
      const seenReturnedIds = new Set<number>();
      const validatedList: Array<{ id: number; text: string }> = [];

      for (const item of parsedResponse.translations) {
        if (!item || typeof item !== "object") {
          return res.status(422).json({
            error: "Response validation failed: malformed translation item received.",
          });
        }

        const idNum = Number(item.id);
        if (isNaN(idNum) || !Number.isInteger(idNum)) {
          return res.status(422).json({
            error: `Response validation failed: invalid non-numeric ID '${item.id}'.`,
          });
        }

        // Check 1: Unexpected ID (not in current requested batch)
        if (!inputIdsSet.has(idNum)) {
          return res.status(422).json({
            error: `Response validation failed: unexpected ID ${idNum} returned in batch response.`,
          });
        }

        // Check 2: Duplicate ID in response
        if (seenReturnedIds.has(idNum)) {
          return res.status(422).json({
            error: `Response validation failed: duplicate ID ${idNum} returned in batch response.`,
          });
        }

        seenReturnedIds.add(idNum);
        const textStr = typeof item.text === "string" ? item.text : String(item.text || "");
        validatedList.push({ id: idNum, text: textStr });
      }

      // Check 3: Missing IDs in response
      const missingIds = cleanSubtitles
        .map((item) => item.id)
        .filter((id) => !seenReturnedIds.has(id));

      if (missingIds.length > 0) {
        return res.status(422).json({
          error: `Response validation failed: missing translations for IDs: [${missingIds.join(", ")}].`,
        });
      }

      // Final validated translation list in exact input order
      const finalTranslations = cleanSubtitles.map((input) => {
        const found = validatedList.find((v) => v.id === input.id);
        return {
          id: input.id,
          text: found ? found.text : "",
        };
      });

      // Return expected structured JSON format
      return res.json({
        translations: finalTranslations,
        results: finalTranslations.map((t) => ({
          id: t.id,
          text: t.text,
          translatedText: t.text,
        })),
      });
    } catch (err: any) {
      console.error("Translation error in /api/translate:", err);
      return res.status(500).json({
        error: err.message || "An error occurred during Gemini translation.",
      });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sinhala Subtitle Translator running on http://localhost:${PORT}`);
  });
}

startServer();
