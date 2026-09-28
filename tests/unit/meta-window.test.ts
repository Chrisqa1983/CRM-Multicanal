import { describe, it, expect } from "vitest";

// Función de prueba representativa de cálculo de ventana de Meta
export function calculateMetaWindow(channel: string, lastInboundAt: Date, now: Date = new Date()) {
  const diffMs = now.getTime() - lastInboundAt.getTime();
  const hours24Ms = 24 * 60 * 60 * 1000;
  const days7Ms = 7 * 24 * 60 * 60 * 1000;

  if (channel === "whatsapp") {
    return {
      isOpen: diffMs <= hours24Ms,
      mode: diffMs <= hours24Ms ? "free_text" : "template_only",
      hoursRemaining: Math.max(0, (hours24Ms - diffMs) / (1000 * 60 * 60)),
    };
  }

  if (channel === "instagram" || channel === "facebook") {
    if (diffMs <= hours24Ms) {
      return { isOpen: true, mode: "free_text", hoursRemaining: (hours24Ms - diffMs) / (1000 * 60 * 60) };
    }
    if (diffMs <= days7Ms) {
      return { isOpen: true, mode: "human_agent_tag", tag: "HUMAN_AGENT" };
    }
    return { isOpen: false, mode: "closed" };
  }

  return { isOpen: true, mode: "free_text" };
}

describe("Meta Messaging Policies Window", () => {
  it("debe permitir texto libre en WhatsApp si el último mensaje fue hace 2 horas", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = calculateMetaWindow("whatsapp", twoHoursAgo);
    expect(result.isOpen).toBe(true);
    expect(result.mode).toBe("free_text");
    expect(result.hoursRemaining).toBeGreaterThan(21);
  });

  it("debe bloquear texto libre y exigir plantillas en WhatsApp si pasaron 25 horas", () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const result = calculateMetaWindow("whatsapp", twentyFiveHoursAgo);
    expect(result.isOpen).toBe(false);
    expect(result.mode).toBe("template_only");
    expect(result.hoursRemaining).toBe(0);
  });

  it("debe inyectar tag HUMAN_AGENT en Instagram si pasaron 3 días (dentro de 7 días)", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = calculateMetaWindow("instagram", threeDaysAgo);
    expect(result.isOpen).toBe(true);
    expect(result.mode).toBe("human_agent_tag");
  });
});
