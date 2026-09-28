# Changelog

Todas las versiones notables del CRM Omnicanal se documentan aquí.

## [1.3.0] - 2026-09-13

### Folletos & Base de Conocimiento RAG (`/knowledge`)
- **Módulo 100% Funcional:** Activación completa de la vista de Folletos & RAG conectada a la base de datos real PostgreSQL con la extensión `pgvector` (1536 dimensiones).
- **Extracción de Documentos Multiformato:**
  - Soporte para archivos `.pdf` mediante un extractor aislado (`scripts/parse-pdf.js`) que previene interferencias con polyfills de Next.js.
  - Soporte para archivos de Word `.docx` mediante `mammoth`.
  - Soporte para archivos de texto plano `.txt` y `.md`.
- **Chunking Semántico & Embeddings:** Fragmentación semántica con solapamiento contextual y generación de embeddings densos de 1536 dimensiones mediante la API de OpenRouter (`openai/text-embedding-3-small`).
- **Probador de Búsqueda Semántica en Tiempo Real:** Permite a los administradores y asesores ingresar cualquier consulta en lenguaje natural y verificar qué fragmentos recupera el motor vectorial y con qué porcentaje de similitud coseno (`<=>`).
- **Visualizador de Chunks:** Modal interactivo para auditar los fragmentos vectorizados de cualquier documento indexado con conteo de caracteres y copiado al portapapeles.
- **Rutas de API Nuevas:** Creación de endpoints REST en `/api/knowledge`, `/api/knowledge/upload`, `/api/knowledge/search` y `/api/knowledge/[id]/chunks`.

### Limpieza de Arquitectura
- **Eliminación de Cal.com:** Eliminación completa de variables obsoletas de Cal.com en `.env`, `templates/env.template`, `wizard.mjs` y `.setup-meta.json`.
- **Ajuste de Prompts Base:** Actualización de los prompts de WhatsApp, Instagram y Facebook para enfocar las solicitudes de citas en coordinación directa con un asesor patrimonial humano.
- **Configuración de Next.js:** Inclusión de `serverExternalPackages: ["pdf-parse", "mammoth"]` en `next.config.mjs`.

## [1.2.0] - 2026-09-12

### Ajustes de Bot (Cerebro Unificado de IA)
- **Renombrado General:** Cambio de "Bot Calificador" a **"Ajustes de Bot"** en el menú de navegación (`sidebar.tsx`) y cabecera principal (`/agents`).
- **Modelo Unificado:** Migración de bots separados por canal a un **Cerebro Central Unificado** con un único prompt maestro, modelo LLM y conjunto de herramientas compartidas.
- **Despliegue y Switches por Red:** Detección en vivo de redes sociales conectadas en Zernio (WhatsApp, Instagram, Facebook), con interruptores individuales de activación/pausa y un botón de corte maestro global.
- **Ocultamiento de Canales Inactivos:** Si una red social no está vinculada o activa en Zernio (ej. Facebook Messenger), su tarjeta y opciones se ocultan automáticamente para evitar confusión con placeholders.
- **Simplificación de la Configuración:** Eliminación de la sección de herramientas y capacidades (function calling) innecesarias, manteniendo la configuración centrada en el modelo LLM, prompt maestro y control por red.
- **Persistencia y Sincronización:** Persistencia en almacenamiento local (`localStorage`) y botón "Actualizar Redes" para refrescar el estado de las conexiones con Zernio en tiempo real.

### Conexión Zernio & Sincronización
- **Detección Automática de Cuentas:** Eliminación de campos manuales de configuración de canales; detección automática de números y perfiles mediante la API `/v1/accounts`.
- **Resolución Inteligente de Webhooks:** Detección dinámica de túneles locales (ngrok) o dominios públicos de producción para el webhook de recepción.

## [1.1.0] - 2026-09-08

### Seguridad
- La contraseña del administrador ya no se guarda en texto plano en `.setup-meta.json`. Se hashea con `scrypt` antes de persistir.
- Agregado `.gitignore` para proteger `.env`, `.setup-meta.json`, `uploads/` y `node_modules/`.
- El wizard ahora detecta si ya existe un `.env` y pregunta antes de sobreescribirlo.

### Mejorado
- Paso 1 (Base de Datos): Pregunta previa "¿Ya tienes una base de datos?" para evitar mostrar guía innecesaria.
- Docker: Opción A ahora recomienda `docker compose up -d` (imagen oficial `pgvector/pgvector:pg16`). Se corrigió la referencia obsoleta a `ankane/pgvector`.
- Variables de entorno: `COMPANY_NAME`, `INDUSTRY` y `NEXT_PUBLIC_COMPANY_NAME` ahora se incluyen en el `.env` generado.
- Schemas: `maxTokens`, `totalChunks` y `chunkIndex` cambiados de `real` a `integer` para evitar errores de precisión.
- Schemas: `conversations`, `contactIdentities` y `templates` ahora incluyen `updatedAt`.
- Schemas: `conversations` ahora incluye `contactId` para vincular identidades omnicanal.
- Manejo graceful de `Ctrl+C` durante el wizard.

### Documentación
- README actualizado con sección de Docker Compose y estructura completa de directorios.

## [1.0.0] - 2026-09-08

### Inicial
- Wizard interactivo con 8 pasos (Vertical, DB, Zernio, OpenRouter, Calendar, Testing, Admin, Ensamblado).
- Arquitectura maestra documentada (`ARQUITECTURA_CRM_DEFINITIVO.md`).
- Templates de schemas Drizzle ORM (auth, messaging, ai, operations).
- Prompts calibrados por canal (WhatsApp, Instagram, Facebook).
- Suite de testing (Playwright E2E + Vitest).
- Docker Compose con PostgreSQL 16 + pgvector.
- Skills de agente para UI design y testing.
- Reglas de dominio para ventana 24h, HMAC y pausa de IA.
