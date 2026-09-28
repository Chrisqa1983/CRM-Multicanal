# 🚀 CRM Omnicanal para Agencia de Seguros & Corredurías

CRM profesional y plataforma omnicanal adaptada para agencias y corredurías de seguros:
- 📲 **Recepción Centralizada:** WhatsApp Business oficial mediante **Zernio API** atendiendo a todos los clientes entrantes 24/7.
- 🤖 **Ajustes de Bot (Cerebro Unificado de IA):** Configurado con **OpenRouter**, RAG de pólizas y Tool Calling. Modelo centralizado con un solo prompt maestro, detección en vivo de redes conectadas en Zernio (WhatsApp, Instagram, Facebook) e interruptores de activación por canal.
- 📧 **Handoff Externo + Notificación por Email:** Envío automático de correo al asesor con enlace directo a la ficha del lead (`/leads/[id]`) para revisar el contexto completo antes de atender al cliente en su propio WhatsApp.
- 📊 **Embudo de Ventas (Pipeline Kanban):** Tablero visual de prospectos (`Nuevo`, `Pendiente de Asesor`, `En Atención`, `Póliza Emitida`, `Perdido`).
- 🛡️ **Clientes & Pólizas (Renovaciones):** Directorio de pólizas emitidas, control de vigencias y alertas automáticas de renovación anual a 30 y 15 días.
- 📚 **Folletos & Base de Conocimientos RAG:** Ingesta y vectorización en tiempo real de folletos y condiciones generales (`.pdf`, `.docx`, `.txt`) con `pgvector` (1536d) en PostgreSQL y embeddings de OpenRouter (`openai/text-embedding-3-small`). Incluye zona drag & drop, probador interactivo de consultas semánticas e inspección de chunks.
- ⏱️ **Ventana de 24h Meta & Plantillas HSM:** Contador en vivo y plantillas aprobadas para recordatorios de renovación de póliza fuera de la ventana.
- 👥 **Equipo Especializado:** Cuentas y roles para el Director y los 3 Asesores por ramo.
- ⚡ **Tiempo Real:** Server-Sent Events (SSE) nativo para entrega inmediata de mensajes y leads en < 100 ms.
- 🧪 **Modo Simulación / Sandbox:** Permite probar el bot calificador y notificaciones sin gastar saldo en Zernio.

---

## 🚀 Inicio Rápido en Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar la base de datos local (PostgreSQL con pgvector)
docker compose up -d

# 3. Aplicar migraciones / esquemas a la base de datos
npm run db:push

# 4. Iniciar servidor de desarrollo
npm run dev
```

El CRM estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🐳 PostgreSQL Local con Docker

El proyecto incluye un `docker-compose.yml` preconfigurado con PostgreSQL 16 + pgvector:

```bash
docker compose up -d
```

Esto levanta una base de datos con:
- **Usuario:** `postgres` / **Contraseña:** `postgres` / **DB:** `crm_db`
- **Puerto:** `5432`
- **Extensión pgvector** preinstalada para RAG semántico
- **Volumen persistente** `crm_pgdata` para que tus datos sobrevivan reinicios
- **Healthcheck** automático cada 5 segundos

---

## 📂 Estructura del Repositorio

```
├── src/                            # Código fuente del CRM (Next.js 15 App Router)
│   ├── app/                        # Rutas de la aplicación (Inbox, Leads, Pólizas, IA, etc.)
│   ├── components/                 # Componentes de UI reutilizables
│   ├── db/                         # Configuración y esquemas Drizzle ORM
│   └── lib/                        # Utilidades, clientes de API y lógica de negocio
├── tests/                          # Suites de pruebas (Vitest y Playwright)
├── ARQUITECTURA_CRM_DEFINITIVO.md  # Documento técnico maestro con todos los detalles
├── docker-compose.yml              # PostgreSQL 16 + pgvector en un comando
├── package.json                    # Dependencias y scripts del proyecto
└── .agents/                        # Customizaciones y reglas para desarrollo con IA
```
