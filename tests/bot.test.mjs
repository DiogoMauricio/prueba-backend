// Prueba del flujo del bot desplegado en la nube (n8n en Render).
// Corre con:  BOT_WEBHOOK_URL="https://..." node --test tests/
// No necesita dependencias: usa fetch y node:test (Node 18+).

import { test } from "node:test";
import assert from "node:assert/strict";

const URL_WEBHOOK = process.env.BOT_WEBHOOK_URL;
const CAMPO = process.env.BOT_CAMPO_RESPUESTA || "output";
const TIMEOUT_MS = Number(process.env.BOT_TIMEOUT_MS || 90000);
const INTENTOS = 2; // Render free se duerme: el primer intento puede despertarlo

async function llamarBot(pregunta) {
  let ultimoError;
  for (let i = 1; i <= INTENTOS; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(URL_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatInput: pregunta, sessionId: `ci-${Date.now()}` }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const texto = await res.text();
      return { res, texto, ms: Date.now() - t0 };
    } catch (e) {
      ultimoError = e;
      console.log(`Intento ${i} falló (${e.name}): ${e.message}`);
    }
  }
  throw ultimoError;
}

test("existe la URL del webhook configurada", () => {
  assert.ok(URL_WEBHOOK, "Falta la variable/secret BOT_WEBHOOK_URL");
  assert.match(URL_WEBHOOK, /^https:\/\//, "La URL debe empezar con https://");
});

test("el bot responde a una pregunta válida", async (t) => {
  if (!URL_WEBHOOK) return t.skip("sin URL");

  const { res, texto, ms } = await llamarBot(
    "¿Cuál fue el presupuesto PIM del sector Educación en 2021?"
  );
  console.log(`HTTP ${res.status} en ${(ms / 1000).toFixed(1)} s`);

  assert.ok(res.ok, `Se esperaba HTTP 2xx y llegó ${res.status}: ${texto.slice(0, 300)}`);

  let json;
  assert.doesNotThrow(() => (json = JSON.parse(texto)), "La respuesta no es JSON válido");

  const cuerpo = Array.isArray(json) ? json[0] : json;
  const valor = cuerpo?.[CAMPO];
  assert.ok(
    typeof valor === "string" ? valor.trim().length > 0 : valor != null,
    `La respuesta no trae el campo "${CAMPO}" con contenido: ${texto.slice(0, 300)}`
  );

  console.log(`Respuesta: ${String(valor).slice(0, 200)}`);
});
