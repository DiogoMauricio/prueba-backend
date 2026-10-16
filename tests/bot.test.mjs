// Prueba de integración: front -> back.
// Llama al webhook del bot en n8n (Railway) igual que lo hace frontend/index.html
// y verifica que la respuesta llegue con el formato que la página espera.
//
// Ejecutar:  BOT_WEBHOOK_URL="https://..." node --test tests/bot.test.mjs
// Sin dependencias: usa fetch y node:test (Node 18+).

import { test } from "node:test";
import assert from "node:assert/strict";

const URL_WEBHOOK = process.env.BOT_WEBHOOK_URL;
const TIMEOUT_MS = Number(process.env.BOT_TIMEOUT_MS || 90000);
const INTENTOS = 2; // por si el servicio está "frío" en el primer intento

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
  assert.ok(URL_WEBHOOK, "Falta el secret BOT_WEBHOOK_URL en GitHub");
  assert.match(URL_WEBHOOK, /^(https:\/\/|http:\/\/localhost)/, "La URL debe empezar con https://");
});

test("el bot responde una consulta con el formato que espera el front", async (t) => {
  if (!URL_WEBHOOK) return t.skip("sin URL");

  const { res, texto, ms } = await llamarBot(
    "¿Cuál fue el PIM de la Municipalidad Distrital de Miraflores en 2021?"
  );
  console.log(`HTTP ${res.status} en ${(ms / 1000).toFixed(1)} s`);

  assert.ok(res.ok, `Se esperaba HTTP 2xx y llegó ${res.status}: ${texto.slice(0, 300)}`);

  let data;
  assert.doesNotThrow(() => (data = JSON.parse(texto)), `La respuesta no es JSON: ${texto.slice(0, 300)}`);
  if (Array.isArray(data)) data = data[0];

  assert.equal(typeof data.output, "string", "Falta el campo 'output'");
  assert.ok(data.output.trim().length > 0, "El campo 'output' viene vacío");
  assert.ok(Array.isArray(data.evolucion), "El campo 'evolucion' debe ser un arreglo");
  assert.ok(data.proveedor_respuesta, "Falta 'proveedor_respuesta' (failover)");
  assert.notEqual(data.success, false, `El flujo devolvió error: ${data.message || data.output}`);

  console.log(`Proveedor: ${data.proveedor_respuesta}`);
  console.log(`Respuesta: ${data.output.slice(0, 200)}`);
});
