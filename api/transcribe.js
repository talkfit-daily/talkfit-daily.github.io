// Vercel Serverless - Audio Transcription via Gemini API

const ALLOWED_ORIGINS = [
  "https://talkfit-daily-github-io.vercel.app",
  "https://talkfit-daily.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export default async function handler(req, res) {
  const origin = req.headers["origin"] || req.headers["referer"] || "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));

  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const { audio, mimeType } = req.body || {};
  if (!audio || !mimeType) {
    return res.status(400).json({ error: "audio (base64)와 mimeType이 필요해요." });
  }

  const audioSize = Buffer.from(audio, "base64").length;
  if (audioSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: "파일이 너무 커요. 4MB 이하의 파일만 가능합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "서버 설정 오류" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are a Korean speech transcriber. Transcribe the audio exactly as spoken in Korean. Output ONLY the transcription text, nothing else. If multiple speakers, separate with line breaks." }] },
          contents: [{
            role: "user",
            parts: [
              { text: "이 오디오를 한국어로 정확하게 받아적어줘. 텍스트만 출력해." },
              { inline_data: { mime_type: mimeType, data: audio } }
            ]
          }],
          generationConfig: { maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." });
      }
      return res.status(502).json({ error: "음성 인식 오류. 잠시 후 다시 시도해주세요." });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: "서버 오류가 발생했어요." });
  }
}
