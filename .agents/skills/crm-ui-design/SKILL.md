---
name: crm-ui-design
description: Design system, tokens, color palettes and UI/UX patterns for building a high-density WhatsApp Web style omnichannel CRM inbox with Tailwind CSS and Radix UI.
---

# CRM UI Design System & Component Guidelines

Este skill guía la construcción y modificación de interfaces de usuario para el CRM Omnicanal, asegurando una estética premium, de alta densidad y coherente con WhatsApp Web y aplicaciones SaaS modernas.

---

## 1. Tokens de Color y Modo Oscuro Nativo

El CRM utiliza una paleta oscura profunda y profesional inspirada en el tema oscuro de WhatsApp Web y Linear:

| Token Semántico | Valor Hex / HSL | Uso Principal |
| :--- | :--- | :--- |
| `--background` | `#090d16` | Fondo principal de la aplicación |
| `--surface-panel` | `#111827` | Fondo de barras laterales y paneles |
| `--surface-card` | `#1a2234` | Tarjetas de conversación, popovers y modales |
| `--border` | `#232f46` | Bordes sutiles de separación entre paneles |
| `--whatsapp-green`| `#25D366` | Acentos de WhatsApp, mensajes enviados propios (`#005c4b`) |
| `--instagram-pink`| `#E1306C` | Badges de Instagram Direct y degradados |
| `--messenger-blue`| `#0084FF` | Badges de Facebook Messenger |
| `--warning-window`| `#eab308` | Alerta de ventana de 24h cerrándose (< 6 horas) |
| `--danger-window` | `#ef4444` | Ventana de 24h expirada (texto bloqueado) |

---

## 2. Layout Tripartito de Alta Densidad (Inbox)

El Inbox debe implementarse siguiendo el patrón tripartito sin márgenes innecesarios:
1. **Panel Izquierdo (`w-80` a `w-96`): Lista de Conversaciones**
   - Buscador rápido con debounce (`placeholder="Buscar por nombre, teléfono o handle..."`).
   - Pestañas horizontales compactas: `Todos`, `WhatsApp`, `Instagram`, `Messenger`.
   - Elemento de chat con avatar, badge de red social, nombre en negrita, fragmento del último mensaje, fecha relativa (`14:32` o `Ayer`), y contador de no leídos en verde.
2. **Panel Central (Flex 1): Hilo Activo de Mensajería**
   - **Header:** Nombre del contacto, estado del bot IA (switch interactivo con indicador verde de activo o amarillo de pausado), y widget de la ventana de 24 horas.
   - **Área de Mensajes:** Fondo con patrón sutil, mensajes alineados a la izquierda (contacto) y a la derecha (asesor o bot con etiqueta "IA").
   - **Checks de Entrega:**
     - `pending`: Icono de reloj gris tenue.
     - `sent`: Un solo check gris.
     - `delivered`: Doble check gris.
     - `read`: Doble check azul celeste (`#53bdeb`).
     - `failed`: Icono de exclamación rojo con tooltip del motivo.
   - **Footer / Compositor:**
     - Si ventana abierta: Campo de texto libre con botón de adjuntar archivo (clip), emojis y botón de enviar.
     - Si ventana cerrada: Campo bloqueado con mensaje *"Ventana de 24h vencida. Solo puedes enviar plantillas aprobadas"* y botón primario *"Seleccionar Plantilla HSM"*.
3. **Panel Derecho (`w-80`): Ficha del Contacto y Acciones Rápidas**
   - Datos del lead (nombre, identificador de red, teléfono si aplica).
   - Selector de etiquetas multicolores (`urgente`, `nuevo_lead`, `vip`).
   - Acceso rápido para agendar cita en el calendario.
   - Notas internas del asesor humano.

---

## 3. Componentes Radix UI & Microinteracciones
- **Modales (Dialog):** Selector de plantillas con vista previa del mensaje y rellenado dinámico de variables `{{1}}`, `{{2}}`.
- **Toasts (Sonner):** Notificaciones flotantes al recibir mensajes de clientes o al agendar citas.
- **Transiciones:** Utilizar `transition-all duration-150` para evitar sensaciones de lentitud en la navegación entre chats.
