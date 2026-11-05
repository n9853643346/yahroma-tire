const db = require("./_db");
module.exports = async (req, res) => {
  const d = String(req.query.date || "");
  if (!/^\d{4}-\d\d-\d\d$/.test(d)) return res.status(400).json({ ok: false });
  try {
    const data = await db.load(); const busy = [];
    for (let m = 0; m < 1440; m += 30) { const t = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); if (!db.isFree(data, d, t)) busy.push(t); }
    res.setHeader("Cache-Control", "no-store"); return res.status(200).json({ ok: true, busy });
  } catch (e) { return res.status(200).json({ ok: true, busy: [] }); }
};
