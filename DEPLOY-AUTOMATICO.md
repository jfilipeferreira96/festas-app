# 🚀 Deploy Automático de Produção — festas (baselandia)

> Fluxo completo em **3 passos**: correr local → upload → 1 comando no servidor.
> Substitui o processo manual (6+ passos) que causava o problema dos processos
> órfãos (o **Restart do cPanel não mata o processo antigo** — ele fica com
> PPID=1 e 11 threads para sempre, acumulando até bater nos 100/100 do
> CloudLinux).

O coração do fluxo é o script **`scripts/deploy-festas.sh`**, que vive no
servidor (`~/deploy-festas.sh`) e faz tudo: mata processos antigos, extrai,
reinicia, verifica e faz rollback automático se algo falhar.

---

## ✅ Setup (UMA só vez)

1. **PC local** (raiz do repo): gerar o bundle e testar:
   ```powershell
   npm run deploy
   ```
   → confirma que termina com `✓ deploy.tar.gz final: ~23.4 MB` e `✓ Query compiler WASM presente`.

2. **File Manager (cPanel)**: fazer upload de **2 ficheiros** para a pasta `HOME` (`/home/baselandia/`):
   - `deploy.tar.gz` (o bundle)
   - `scripts/deploy-festas.sh` (o script — ver nota de line endings abaixo)

3. **Terminal (cPanel)**, uma só vez:
   ```bash
   chmod +x ~/deploy-festas.sh
   # sanity check: ver o script sem caracteres de Windows (^M)
   head -5 ~/deploy-festas.sh
   ```
   > ⚠️ Se o ficheiro foi editado no Windows e aparecer `^M` ou o bash reclamar
   > de `\r`, converter com: `sed -i 's/\r$//' ~/deploy-festas.sh`

---

## 🔄 Deploy diário (o fluxo normal)

| Passo | Onde | Ação |
|---|---|---|
| 1 | PC local | `npm run deploy` |
| 2 | File Manager | upload do `deploy.tar.gz` para `~/` (substituir) |
| 3 | Terminal cPanel | `bash ~/deploy-festas.sh` |

**FIM.** O script faz tudo o resto e no fim mostra:

```
[deploy] Antes:      processos=24 threads=26
[  OK  ] Zero processos next-server (sem stacking).
[  OK  ] Prisma WASM validado (query_compiler_bg.wasm, zero engines Rust).
[deploy] HTTP=307  |  processos next-server:
        PID=81234 NLWP=11
[deploy] Depois:     processos=13 threads=15
[  OK  ] DEPLOY CONCLUÍDO COM SUCESSO ✔
```

### O que o script faz (por ordem)

1. **Valida** o tarball (`app.js` na raiz)
2. **Métricas antes** → `~/app.baselandia.pt/logs/deploy.log`
3. **Backup**: `.env`, `apps/web/public/uploads/` e o tarball → `~/deploy-backups/<timestamp>/` (rotação de 3)
4. **MATA todos** os `next-server`/`Passenger` (TERM → KILL aos 3s) — *o passo que o Restart do cPanel não faz*
5. **Extrai** o tarball por cima da app
6. **Restaura** `.env` de produção e `uploads/` (nunca são perdidos)
7. **Valida Prisma WASM**: `query_compiler_bg.wasm` presente + zero engines `.node` (senão → rollback)
8. **Reinicia**: `touch tmp/restart.txt` + 1 request para forçar o spawn
9. **Verifica**: exatamente 1 processo, NLWP ≤ 15, HTTP 200/307
10. **Rollback automático** se algo falhar (re-extrai o tarball anterior de `~/deploy-backups/`)

### Configuração (opcional, via variáveis de ambiente)

```bash
# defaults — só precisas disto se algo for diferente no teu servidor:
FESTAS_APP_DIR="$HOME/app.baselandia.pt" \
FESTAS_APP_URL="https://app.baselandia.pt" \
bash ~/deploy-festas.sh

# tarball noutro sítio:
bash ~/deploy-festas.sh /caminho/para/deploy.tar.gz
```

---

## 🧯 Se algo correr mal

| Sintoma | Solução |
|---|---|
| `[FAIL] Tarball não encontrado` | Faz upload do `deploy.tar.gz` para `~/` ou passa o caminho como argumento |
| `[FAIL] Extração falhou` | Quota cheia — apaga backups antigos: `ls ~/deploy-backups/` e remove os mais velhos |
| `Rollback aplicado` | O bundle novo falhou numa verificação — o anterior foi restaurado; vê `logs/deploy.log` e o erro acima |
| Ainda vejo 2+ processos `next-server` | `ps -u $USER -o pid,ppid,nlwp,args` e `kill <PID>` aos que têm PPID=1 |
| Quero voltar atrás manualmente | `ls ~/deploy-backups/*/deploy.tar.gz` → `bash ~/deploy-festas.sh <caminho-do-anterior>` |

## 📜 Logs e auditoria

- **Cada deploy**: `~/app.baselandia.pt/logs/deploy.log` (métricas antes/depois, HTTP, NLWP)
- **Backups**: `~/deploy-backups/<timestamp>/` (`.env`, `uploads/`, `deploy.tar.gz`) — últimos 3

## 🛡️ Rede de segurança (mantém-se)

- **Cron 02:00** — `recycle-festas.sh` (versão condicional: só recicla se threads > 40, zombies ou órfãos; senão escreve `OK — sem reciclagem` no `recycle.log`)
- A causa raiz dos 75 threads (engine Rust do Prisma) foi eliminada com `engineType = "client"` no `schema.prisma`; o deploy script **recusa** bundles sem WASM, por isso não pode regredir.
