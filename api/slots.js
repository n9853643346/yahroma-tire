// Прокси к единой базе в Яндекс Облаке (резервная Vercel-версия)
const FN = "https://functions.yandexcloud.net/d4ev96t61e3fse642aqc";
module.exports = async (req, res) => {
  try {
    const q = new URLSearchParams({ r: "slots" });
    for (const [k, v] of Object.entries(req.query || {})) if (k !== "r") q.set(k, String(v));
    const init = { method: req.method, headers: { "content-type": "application/json" } };
    if (req.headers["x-key"]) init.headers["x-key"] = req.headers["x-key"];
    if (req.method !== "GET" && req.method !== "HEAD") init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const r = await fetch(FN + "?" + q, init);
    res.status(r.status).setHeader("content-type", "application/json").send(await r.text());
  } catch (e) { res.status(502).json({ ok: false }); }
};
