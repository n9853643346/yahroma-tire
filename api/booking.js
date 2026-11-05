// Vercel function: заявка с сайта -> Telegram (бот @Shinomontag_yahroma_bot). Токен и chat id — в env Vercel.
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const phone = String(b.phone || "").trim();
  if (phone.replace(/\D/g, "").length < 10) return res.status(400).json({ ok: false, error: "phone" });
  const text = [
    "<b>Новая заявка с сайта ПИТ-СТОП</b>",
    "Имя: " + esc(b.name || "—"),
    "Телефон: " + esc(phone),
    "Авто: " + esc(b.car || "—"),
    "Время: " + esc(b.time || b.fallback_time || "—"),
  ].join("\n");
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.ADMIN_CHAT_ID, text, parse_mode: "HTML" }),
    });
    if (!r.ok) return res.status(502).json({ ok: false });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
