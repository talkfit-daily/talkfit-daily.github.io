// Vercel Serverless - Gemini API Proxy (secured)
// 파일명은 claude.js 유지 (프론트엔드 /api/claude 경로 호환)

const ALLOWED_ORIGINS = [
  "https://talkfit-daily-github-io.vercel.app",
  "https://talkfit-daily.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
  // Capacitor 네이티브 앱 (iOS WKWebView / Android WebView)
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
];

// 일일 AI 한도 — 무료: 20회 고정, 프리미엄: 추후 확장
function getDailyLimit(level) {
  return 30;
}
const MAX_SYSTEM_LEN = 5000;
const MAX_USER_LEN = 3000;

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

  // ── Rate Limiting (레벨별 차등 / 프리미엄 우회) ──────────────────
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const rlKey = `rl:${ip}:${today}`;
  const userLevel = parseInt(req.body?.level) || 1;
  const isPremium = req.body?.isPremium === true;
  const dailyLimit = isPremium ? 9999 : getDailyLimit(userLevel);

  if (!global._rlStore) global._rlStore = {};
  if (global._rlDate !== today) { global._rlStore = {}; global._rlDate = today; global._globalCount = 0; }

  // 글로벌 일일 캡 — Gemini 무료 tier 1500회 중 안전하게 1200회
  global._globalCount = (global._globalCount || 0);
  if (global._globalCount >= 1200) {
    return res.status(429).json({
      error: "오늘 서버 사용량이 초과됐어요. 내일 다시 이용해주세요!",
      remaining: 0,
    });
  }

  const count = global._rlStore[rlKey] || 0;
  if (count >= dailyLimit) {
    return res.status(429).json({
      error: `오늘 AI 사용 횟수(${dailyLimit}회)를 모두 사용했어요.`,
      remaining: 0,
    });
  }

  // ── API Key ──────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "서버 설정 오류" });

  // ── Gemini API 호출 (2.5-flash → 2.0-flash 자동 fallback) ────────
  const callGemini = async (model) => {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );
    const d = await r.json();
    return { ok: r.ok, status: r.status, data: d };
  };

  try {
    let result = await callGemini("gemini-2.5-flash");
    let modelUsed = "gemini-2.5-flash";

    if (!result.ok && (result.status === 429 || result.status >= 500)) {
      result = await callGemini("gemini-2.5-flash-lite");
      modelUsed = "gemini-2.5-flash-lite";
    }

    if (!result.ok) {
      const geminiMsg = result.data?.error?.message || "(no detail)";
      if (result.status === 429) {
        return res.status(429).json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요.", detail: geminiMsg });
      }
      return res.status(502).json({ error: "AI 서비스 일시 오류. 잠시 후 다시 시도해주세요.", detail: geminiMsg, status: result.status });
    }

    const text = result.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    global._rlStore[rlKey] = count + 1;
    global._globalCount = (global._globalCount || 0) + 1;

    return res.status(200).json({
      text,
      remaining: dailyLimit - count - 1,
      dailyLimit: dailyLimit,
      model: modelUsed,
    });
  } catch (err) {
    return res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.", detail: err.message });
  }
}
