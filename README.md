# FinEdu-Bot

Bot de consultas presupuestales del MEF (Perú) con IA y RAG.

```
 [ frontend/ ]  ──POST {chatInput, sessionId}──▶  [ backend: n8n en Railway ]  ──▶  PostgreSQL (MEF)
  página web    ◀──── JSON {output, evolucion, …} ──  webhook /ai-agent-orchestrator
```

## Estructura

```
.
├── .github/
│   ├── workflows/ci.yml        # checks automáticos en cada PR a main
│   └── CODEOWNERS              # quién debe aprobar los cambios
├── frontend/
│   ├── index.html              # página de consulta (chat)
│   └── config.js               # URL del webhook de n8n
├── backend/
│   └── n8n/workflows/          # exportaciones .json de los flujos
│       ├── finedu-bot-orquestador.json       # webhook + AI Agent + failover + Security Filter
│       ├── finedu-consulta-puntual-rag.json  # herramienta consulta_puntual
│       └── finedu-consulta-evolucion-sql.json# herramienta consulta_evolucion
└── tests/
    └── bot.test.mjs            # prueba front → back contra el n8n en la nube
```

## Frontend

1. Abre `frontend/index.html` en el navegador (doble clic o con Live Server).
2. Escribe una consulta. La página envía `{ chatInput, sessionId }` al webhook y muestra:
   - el texto de `output`,
   - la tabla de `evolucion` por años cuando el bot la devuelve,
   - el proveedor que respondió (`proveedor_respuesta`, para evidenciar el failover) y el `correlation_id`.
3. Si la consulta es de alto riesgo, n8n responde texto plano y la página lo muestra como aviso.

La URL del webhook está en `frontend/config.js`. **No pongas claves de API en el frontend**: todo lo que está ahí lo puede ver cualquier usuario.

Si el navegador muestra error de CORS, en n8n abre el nodo **Webhook → Options → Allowed Origins (CORS)** y pon `*` (o el dominio donde publiques la página).

## Backend (n8n)

- Instancia: n8n en Railway.
- Flujo principal: **FinEdu-Caso5-Cedula4** (webhook `POST /webhook/ai-agent-orchestrator`).
- Para restaurar: en n8n → *Import from File* con cada `.json`. Las credenciales (Postgres, OpenAI, Gemini) **no van en el repo**: se crean en n8n y se vuelven a asignar a los nodos.
- Al importar las herramientas, actualiza en los nodos `consulta_puntual` y `consulta_evolucion` el flujo al que apuntan si cambian los IDs.

## Prueba (front → back)

```bash
BOT_WEBHOOK_URL="https://n8n-production-52da.up.railway.app/webhook/ai-agent-orchestrator" \
  node --test tests/bot.test.mjs
```

Verifica que el webhook responda HTTP 2xx, en JSON, con `output` con texto, `evolucion` como arreglo, `proveedor_respuesta` presente y sin `success: false`.

## Reglas de seguridad para el merge

**Settings → Rules → Rulesets → New branch ruleset**:

| Campo | Valor |
|---|---|
| Ruleset name | `proteger-main` |
| Enforcement status | **Active** |
| Bypass list | vacío; si trabajas solo, agrégate como admin (GitHub no deja aprobar tu propio PR) |
| Target branches | **Include default branch** (`main`) |
| Restrict deletions | ✅ |
| Block force pushes | ✅ |
| Require a pull request before merging | ✅ — Required approvals: **1**, ✅ Dismiss stale approvals when new commits are pushed, ✅ Require review from Code Owners, ✅ Require conversation resolution before merging |
| Require status checks to pass | ✅ — ✅ Require branches to be up to date — checks: **Validar JSON de flujos n8n** y **Prueba del flujo del bot** |

Además, en **Settings → Secrets and variables → Actions** crea el secret `BOT_WEBHOOK_URL`.

Checks que corren en cada PR a `main`:

| Check | Qué valida |
|---|---|
| Validar JSON de flujos n8n | Cada `.json` de `backend/n8n/workflows` es un flujo válido y ningún archivo del front/back trae claves o contraseñas escritas |
| Prueba del flujo del bot | Consulta real al n8n en la nube con el mismo formato que usa la página |

## Flujo de trabajo

1. `git checkout -b feature/nombre-cambio`
2. Commit y push de la rama.
3. Pull Request hacia `main`.
4. Checks en verde + aprobación del líder DevSecOps (CODEOWNERS).
5. Merge.
