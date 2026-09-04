// app2.js - TESTE de configuração cPanel / CloudLinux (CommonJS)
// -----------------------------------------------------------------------------
// Serve uma página HTML simples para verificar que o Node.js + Phusion Passenger
// estão configurados correctamente. NÃO precisa de node_modules.
//
// USO:
//   1. No cPanel (CloudLinux Node.js Selector):
//      "Application startup file" = app2.js
//   2. Clicar Restart / Start.
//   3. Abrir o URL da aplicação no browser.
//   4. Se aparecer "Node.js OK!" -> configuracao correcta!
//      Depois mudar o startup file de volta para app.js.
//
// CommonJS (require) para maxima compatibilidade com todas as versoes do Passenger.
// -----------------------------------------------------------------------------

var http = require("http");

var port = parseInt(process.env.PORT, 10) || 3000;
var hostname = process.env.HOSTNAME || "0.0.0.0";

var html =
  "<!DOCTYPE html>\n" +
  '<html lang="pt">\n' +
  "<head>\n" +
  '  <meta charset="utf-8">\n' +
  '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  "  <title>OK - cPanel</title>\n" +
  "  <style>\n" +
  "    * { box-sizing: border-box; }\n" +
  "    body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 60px 20px; background: #f0f4f8; margin: 0; }\n" +
  "    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,.08); }\n" +
  "    h1 { color: #16a34a; margin: 0 0 8px; font-size: 28px; }\n" +
  "    .subtitle { color: #475569; margin-bottom: 24px; }\n" +
  "    .info { color: #64748b; font-size: 14px; line-height: 2; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: left; }\n" +
  "    .info strong { color: #334155; }\n" +
  "    code { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 13px; color: #1e293b; }\n" +
  "    hr { margin: 24px 0; border: none; border-top: 1px solid #e2e8f0; }\n" +
  "    .hint { font-size: 13px; color: #94a3b8; }\n" +
  "  </style>\n" +
  "</head>\n" +
  "<body>\n" +
  '  <div class="card">\n' +
  "    <h1>Node.js OK!</h1>\n" +
  '    <p class="subtitle">A configuracao do cPanel / CloudLinux esta correcta.</p>\n' +
  '    <div class="info">\n' +
  "      <p><strong>Node.js:</strong> " +
  process.version +
  "</p>\n" +
  "      <p><strong>Port:</strong> " +
  port +
  "</p>\n" +
  "      <p><strong>Hostname:</strong> " +
  hostname +
  "</p>\n" +
  "      <p><strong>Data:</strong> " +
  new Date().toISOString() +
  "</p>\n" +
  "    </div>\n" +
  "    <hr>\n" +
  '    <p class="hint">\n' +
  "      Proximo passo: mudar <code>Application startup file</code> para <code>app.js</code>\n" +
  "    </p>\n" +
  "  </div>\n" +
  "</body>\n" +
  "</html>\n";

var server = http.createServer(function (req, res) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, hostname, function () {
  console.log("app2.js (teste) a correr em http://" + hostname + ":" + port + " - Node " + process.version);
});
