// app2.js — TESTE de configuração cPanel / CloudLinux
// -----------------------------------------------------------------------------
// Serve uma página HTML simples para verificar que o Node.js + Phusion Passenger
// estão configurados correctamente. NÃO precisa de node_modules.
//
// USO:
//   1. No cPanel (CloudLinux Node.js Selector):
//      "Application startup file" = app2.js
//   2. Clicar Restart / Start.
//   3. Abrir o URL da aplicação no browser.
//   4. Se aparecer "✅ Node.js OK!" → configuração correcta!
//      Depois mudar o startup file de volta para app.js.
//
// Este ficheiro é copiado para o bundle pelo scripts/build-deploy.mjs.
// -----------------------------------------------------------------------------

import http from "node:http";

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>✅ cPanel OK</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 60px 20px; background: #f0f4f8; margin: 0; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    h1 { color: #16a34a; margin: 0 0 8px; font-size: 28px; }
    .subtitle { color: #475569; margin-bottom: 24px; }
    .info { color: #64748b; font-size: 14px; line-height: 2; background: #f8fafc; border-radius: 8px; padding: 16px; }
    .info strong { color: #334155; }
    code { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 13px; color: #1e293b; }
    hr { margin: 24px 0; border: none; border-top: 1px solid #e2e8f0; }
    .hint { font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✅ Node.js OK!</h1>
    <p class="subtitle">A configuração do cPanel / CloudLinux está correcta.</p>
    <div class="info">
      <p><strong>Node.js:</strong> ${process.version}</p>
      <p><strong>Port:</strong> ${port}</p>
      <p><strong>Hostname:</strong> ${hostname}</p>
      <p><strong>Data:</strong> ${new Date().toISOString()}</p>
    </div>
    <hr>
    <p class="hint">
      Próximo passo: mudar <code>Application startup file</code> para <code>app.js</code>
    </p>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, hostname, () => {
  console.log(`app2.js (teste) a correr em http://${hostname}:${port} — Node ${process.version}`);
});
