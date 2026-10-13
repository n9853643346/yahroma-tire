import { createServer } from "node:http";

const PORT = process.env.PORT || 3300;

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = createServer((req, res) => {
  if (req.url === "/api/booking" && req.method === "OPTIONS") {
    withCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/booking" && req.method === "POST") {
    withCors(res);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
});

server.listen(PORT, () => {
  console.log(`[bot] http server listening on :${PORT}`);
});
