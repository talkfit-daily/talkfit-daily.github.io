// Vercel Serverless - Gemini API Proxy (secured)
// 파일명은 claude.js 유지 (프론트엔드 /api/claude 경로 호환)

const ALLOWED_ORIGINS = [
  "https://talkfit-daily-github-io.vercel.app",
  "https://talkfit-daily.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];

const DAILY_LIMIT = 30;
const MAX_SYSTEM_LEN = 800;
const MAX_USER_LEN = 1000;

export default async function handler(req, res) {
  // ── Origin 검증 ──────────────────────────────────────────────────
  const origin = req.headers["origin"] || req.headers["referer"] || "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));

  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  // ── 입력 검증 ────────────────────────────────────────────────────
  const { system, user } = req.body || {};
  if (!system || !user || typeof system !== "string" || typeof user !== "string") {
    return res.status(400).json({ error: "system and user fields are required" });
  }
  if (system.length > MAX_SYSTEM_LEN || user.length > MAX_USER_LEN) {
    return res.status(400).json({ error: "입력이 너무 길어요. 짧게 줄여주세요." });
  }

  // ── Rate Limiting ────────────────────────────────────────────────
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const rlKey = `rl:${ip}:${today}`;

  if (!global._rlStore) global._rlStore = {};
  if (global._rlDate !== today) { global._rlStore = {}; global._rlDate = today; }

  const count = global._rlStore[rlKey] || 0;
  if (count >= DAILY_LIMIT) {
    return res.status(429).json({
      error: `오늘 AI 사용 횟수(${DAILY_LIMIT}회)를 모두 사용했어요. 내일 다시 만나요!`,
      remaining: 0,
    });
  }

  // ── API Key ──────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "서버 설정 오류" });

  // ── Gemini API 호출 (Flash 2.0: 무료 tier 일 1500회) ─────────────
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." });
      }
      return res.status(502).json({ error: "AI 서비스 일시 오류. 잠시 후 다시 시도해주세요." });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    global._rlStore[rlKey] = count + 1;

    return res.status(200).json({
      text,
      remaining: DAILY_LIMIT - count - 1,
    });
  } catch (err) {
    return res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." });
  }
}
