// Знайка (@znayka_bot): личный бот Алекса, Gemini через OpenRouter. Ответ отдаётся прямо в ответе на вебхук.
const MODEL = "google/gemini-3.8-flash";
const GH = () => `https://api.github.com/repos/${process.env.GH_REPO}/contents/znayka.json`;
const GHH = () => ({ Authorization: "Bearer " + process.env.GH_TOKEN, "User-Agent": "znayka", Accept: "application/vnd.github+json" });
async function load() {
  const r = await fetch(GH(), { headers: GHH() });
  if (r.status === 404) return { s: { owner: null, hist: [] }, sha: null };
  const j = await r.json();
  return { s: JSON.parse(Buffer.from(j.content, "base64").toString("utf8")), sha: j.sha };
}
async function save(s, sha) {
  await fetch(GH(), { method: "PUT", headers: GHH(), body: JSON.stringify({ message: "znayka state", content: Buffer.from(JSON.stringify(s)).toString("base64"), sha: sha || undefined }) });
}
async function ask(hist) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", headers: { Authorization: "Bearer " + process.env.OPENROUTER_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: "Ты Знайка, личный помощник Алекса. Отвечай по-русски, коротко и по делу, обычным текстом без разметки." }, ...hist] }),
  });
  const tx = await r.text(); let j; try { j = JSON.parse(tx); } catch { return "Ответ " + r.status; }
  if (!r.ok) return "Ошибка модели: " + r.status + " " + tx.slice(0, 150);
  return j.choices[0].message.content || "(пустой ответ)";
}
module.exports = async (req, res) => {
  const q = req.query || {};
  if (q.r === "hook" || q.r === "info") {
    if (q.k !== process.env.ZN_SETUP) return res.status(401).end();
    const base = `https://api.telegram.org/bot${process.env.ZN_TOKEN}/`;
    const u = q.r === "info" ? base + "getWebhookInfo" : base + `setWebhook?url=${encodeURIComponent("https://pitstop-yahroma.vercel.app/api/znayka")}&secret_token=${process.env.ZN_SECRET}&drop_pending_updates=true`;
    res.setHeader("Location", u); return res.status(302).end();
  }
  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.ZN_SECRET) return res.status(401).end();
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const m = b.message; if (!m || !m.text) return res.status(200).end();
  const reply = (t) => res.status(200).json({ method: "sendMessage", chat_id: m.chat.id, text: String(t).slice(0, 4000) });
  const { s, sha } = await load();
  let nsha = sha;
  if (!s.owner) { s.owner = m.from.id; await save(s, sha); nsha = (await load()).sha; }
  if (m.from.id !== s.owner) return reply("Это личный бот.");
  if (m.text === "/start") return reply("Привет, Алекс! Я Знайка, пиши — отвечу.");
  if (m.text === "/clear") { s.hist = []; await save(s, nsha); return reply("Память очистил."); }
  s.hist.push({ role: "user", content: m.text }); s.hist = s.hist.slice(-12);
  const a = await ask(s.hist);
  s.hist.push({ role: "assistant", content: a }); s.hist = s.hist.slice(-12);
  await save(s, nsha);
  return reply(a);
};
