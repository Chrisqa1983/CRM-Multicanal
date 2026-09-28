---
name: playwright-crm-testing
description: Workflow and best practices for end-to-end and integration testing of the omnichannel CRM using Playwright, Vitest and the synthetic webhook simulation engine without incurring Meta/Zernio API costs.
---

# Playwright & Vitest CRM Testing Workflow

Este skill proporciona la guía para ejecutar, depurar y crear pruebas automatizadas para el CRM Omnicanal aprovechando el modo de simulación (`SIMULATION_MODE=true`).

---

## 1. Comandos de Ejecución de Pruebas

```bash
# 1. Ejecutar pruebas unitarias y de lógica de negocio (Vitest)
npm test

# 2. Modo interactivo de Vitest para desarrollo continuo (TDD)
npm run test:watch

# 3. Ejecutar todas las pruebas E2E con Playwright (Headless)
npx playwright test

# 4. Modo interactivo visual de Playwright (UI Runner)
npx playwright test --ui

# 5. Ver el reporte HTML detallado tras una ejecución
npx playwright show-report
```

---

## 2. Inyección de Webhooks Sintéticos (WhatsApp, Instagram, Messenger)

Para probar flujos de mensajería sin gastar saldo en Zernio ni depender de números reales, se utiliza el endpoint de simulación local:

```typescript
// tests/fixtures/simulation.ts
export async function injectSyntheticMessage(request, {
  channel = "whatsapp",
  senderName = "Carlos Prueba",
  senderId = "+525500000000",
  text = "Hola, me gustaría agendar una cita",
}) {
  const response = await request.post("/api/simulation/webhook", {
    data: {
      channel,
      senderId,
      senderName,
      text,
      timestamp: new Date().toISOString(),
    },
  });
  return response.json();
}
```

---

## 3. Patrones de Aserción Críticos en E2E

### 3.1. Validar la Pausa Automática del Bot
Al probar la intervención de un asesor humano:
```typescript
// 1. Inyectar mensaje simulado del cliente
await injectSyntheticMessage(request, { text: "Hola bot" });

// 2. El operador escribe manualmente
await page.locator("textarea[name='message']").fill("Hola, te atiende un asesor");
await page.keyboard.press("Enter");

// 3. El switch de la IA debe reflejarse como 'Pausado' en el header
await expect(page.locator("[data-testid='ai-status-badge']")).toContainText(/Pausado/i);
```

### 3.2. Validar el Bloqueo de la Ventana de 24 Horas
```typescript
// Forzar fecha de último mensaje a más de 24 horas
await setConversationLastInbound(convId, 25 * 60 * 60 * 1000);

// Verificar que el compositor de texto se desactiva
await expect(page.locator("textarea[name='message']")).toBeDisabled();
// Y que el botón de plantillas es visible
await expect(page.locator("button:has-text('Seleccionar Plantilla HSM')")).toBeVisible();
```

---

## 4. Playwright CLI Superpowers (Herramientas Visuales y Generación)

### 4.1. Generador Automático de Pruebas (Playwright Codegen)
Permite interactuar con la interfaz del CRM en un navegador real y Playwright escribirá automáticamente el código del test en TypeScript:
```bash
# Inicia el grabador apuntando al Inbox local
npm run test:e2e:codegen
# o: npx playwright codegen http://localhost:3000/inbox
```
Al hacer clic en pestañas, escribir mensajes o seleccionar plantillas, el código del test se generará en una ventana adyacente.

### 4.2. Depurador Visual Interactivo (UI Mode)
Para inspeccionar paso a paso cada acción, viajar en el tiempo (*time-travel debugging*) y ver el estado del DOM y peticiones de red:
```bash
npm run test:e2e:ui
```

### 4.3. Inspección Forense de Red y SSE (Trace Viewer)
Si una prueba falla, Playwright graba un rastro completo (capturas de pantalla, consola, llamadas a Zernio y eventos SSE). Para abrirlo:
```bash
npx playwright show-trace test-results/.../trace.zip
```

---

## 5. Simulación Rápida desde la Terminal (CLI Runner)
Sin abrir el navegador, puedes simular la llegada de un cliente por WhatsApp o Instagram para verificar que el backend y la IA reaccionen:
```bash
# Disparar mensaje de WhatsApp
node tests/cli-simulate.mjs --channel whatsapp --text "¿Tienen citas disponibles para mañana?"

# Disparar mensaje de Instagram Direct
node tests/cli-simulate.mjs --channel instagram --text "Hola, ¿cuánto cuesta el tratamiento?"
```

