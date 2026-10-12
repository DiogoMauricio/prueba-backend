# FinEdu-Bot

Bot de consultas presupuestales del MEF (Perú) con IA y RAG, construido en n8n y desplegado en Render, con base de datos PostgreSQL.

## Estructura

```
.
├── .github/
│   ├── workflows/ci.yml     # checks automáticos en cada PR a main
│   └── CODEOWNERS           # quién debe aprobar los cambios
├── n8n/workflows/           # exportaciones .json de los flujos (bot e ingesta MEF)
├── infrastructure/          # Dockerfile de n8n para Render
├── tests/
│   ├── prueba-bot.html      # prueba manual en el navegador
│   └── bot.test.mjs         # prueba automática (corre en GitHub Actions)
└── README.md
```

## Prueba del flujo del bot

### Manual (HTML)
1. En n8n, activa el flujo del bot y copia la **Production URL** del nodo Webhook (no la Test URL).
2. En el nodo Webhook → Options → **Allowed Origins (CORS)**, pon `*` mientras pruebas (o el origen desde donde abras el HTML).
3. Abre `tests/prueba-bot.html` en el navegador, pega la URL y pulsa **Ejecutar prueba**.
4. La prueba pasa si: el servidor responde, devuelve HTTP 2xx, la respuesta es JSON y trae el campo `output` con texto.

### Automática
```bash
BOT_WEBHOOK_URL="https://TU-SERVICIO.onrender.com/webhook/TU-RUTA" node --test tests/
```
En GitHub corre sola en cada Pull Request a `main` (ver sección de seguridad).

## Reglas de seguridad para el merge

Configuración en **Settings → Rules → Rulesets → New branch ruleset**:

| Campo | Valor |
|---|---|
| Ruleset name | `proteger-main` |
| Enforcement status | **Active** |
| Bypass list | vacío (o solo tú como admin, si trabajas solo) |
| Target branches | **Include default branch** (`main`) |
| Restrict deletions | ✅ |
| Block force pushes | ✅ |
| Require a pull request before merging | ✅ — Required approvals: **1**, ✅ Dismiss stale approvals when new commits are pushed, ✅ Require review from Code Owners, ✅ Require conversation resolution before merging |
| Require status checks to pass | ✅ — ✅ Require branches to be up to date — agregar los checks **Validar JSON de flujos n8n** y **Prueba del flujo del bot** |

Además:
- **Settings → Secrets and variables → Actions → New repository secret**: `BOT_WEBHOOK_URL` con la Production URL del webhook. Nunca escribas esa URL ni credenciales en el código.
- Los checks solo aparecen en la lista para elegir después de que el workflow haya corrido al menos una vez (abre un PR de prueba primero).

## Flujo de trabajo

1. Crear rama: `git checkout -b feature/nombre-cambio`
2. Commit y push de la rama.
3. Abrir Pull Request hacia `main`.
4. Esperar que los checks pasen y que el líder DevSecOps apruebe.
5. Merge.
