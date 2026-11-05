const db = require("./_db");
// Одноразово: привязать Telegram-бота к этому сайту. Защищено паролем журнала.
module.exports = async (req, res) => {
  if (!db.authed(req)) return res.status(401).json({ ok: false });
  const host = req.headers.host;
  const r = await db.tg("setWebhook", { url: `https://${host}/api/tg`, secret_token: process.env.TG_SECRET, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
  await db.tg("setMyCommands", { commands: [{ command: "start", description: "Записаться" }, { command: "cancel", description: "Отменить мою запись" }] });
  res.status(200).json({ ok: r.ok, description: r.description });
};
