import { test, expect } from "@playwright/test";

test.describe("Inbox Omnicanal con Modo Simulación", () => {
  test("debe cargar el Inbox y mostrar los filtros de canal", async ({ page }) => {
    await page.goto("/inbox");
    
    // Verificar título o cabecera
    await expect(page.getByRole("heading", { name: /Bandeja de Entrada/i })).toBeVisible();
    
    // Verificar pestañas de canal
    await expect(page.getByRole("tab", { name: /Todos/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /WhatsApp/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Instagram/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Messenger/i })).toBeVisible();
  });

  test("debe pausar el Agente de IA cuando un operador envía un mensaje manual", async ({ page }) => {
    await page.goto("/inbox");
    
    // Seleccionar primera conversación simulada
    const firstChat = page.locator("[data-testid='conversation-item']").first();
    if (await firstChat.isVisible()) {
      await firstChat.click();
      
      // Escribir mensaje manual del asesor
      const composer = page.locator("textarea[name='message']");
      await composer.fill("Hola, soy un asesor humano y te voy a atender.");
      await page.keyboard.press("Enter");
      
      // El interruptor del bot debe reflejarse como pausado / inactivo
      const botSwitch = page.locator("[data-testid='ai-status-badge']");
      await expect(botSwitch).toContainText(/Pausado|Inactivo/i);
    }
  });
});
