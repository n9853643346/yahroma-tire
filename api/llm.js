// Ретранслятор к OpenRouter (Яндекс-функция из РФ блокируется OpenRouter). Ключ приходит в заголовке, здесь не хранится.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: req.headers.authorization || "", "Content-Type": "application/json" },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });
    res.status(r.status).setHeader("Content-Type", "application/json").send(await r.text());
  } catch (e) { res.status(502).json({ error: { message: "relay" } }); }
};
