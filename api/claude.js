// Vercel Serverless - Claude API Proxy with IP-based rate limiting
// No login required, no database required

const DAILY_LIMIT = 3;
const rateLimitStore = {};

function getKey(ip) {
  return ip + ":" + new Date().toISOString().slice(0, 10);
}

function cleanup() {
  const today = new Date().toISOString().slice(0, 10);
  for (const k of Object.keys(rateLimitStore)) {
    if (!k.endsWith(today)) delete rateLimitStore[k];
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const key = getKey(ip);
  cleanup();

  const count = rateLimitStore[key] || 0;
  if (count >= DAILY_LIMIT) {
    return res.status(429).json({
      error: "오늘 AI 사용 횟수(" + DAILY_LIMIT + "회)를 모두 사용했어요. 내일 다시 만나요!",
      remaining: 0,
    });
  }

  const { system, user } = req.body || {};
  if (!system || !user) {
    return res.status(400).json({ error: "system and user fields are required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "API error" });
    }

    rateLimitStore[key] = count + 1;
    const remaining = DAILY_LIMIT - count - 1;

    return res.status(200).json({
      text: data.content?.[0]?.text || "",
      remaining: remaining,
    });
  } catch (err) {
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
}
