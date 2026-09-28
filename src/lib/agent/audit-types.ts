export interface AuditScenario {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientPersonaPrompt: string;
  initialMessage: string;
  category: "auto" | "gastos_medicos" | "urgencia" | "alucinacion";
  targetTurns: number;
}

export interface ConversationTurn {
  turnIndex: number;
  sender: "client" | "bot";
  senderName: string;
  text: string;
  timestamp: string;
}

export interface ScenarioTranscript {
  scenarioId: string;
  scenarioTitle: string;
  clientName: string;
  turns: ConversationTurn[];
}

export interface AuditEvaluationResult {
  overallScore: number;
  empathyScore: number;
  technicalAccuracyScore: number;
  channelFormatScore: number;
  leadQualificationScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  proposedPrompt: string;
}

export const AUDIT_SCENARIOS: AuditScenario[] = [
  {
    id: "scenario_1_auto",
    title: "Prospecto Ideal: Cotización de Auto",
    description: "Cliente interesado en seguro para Mazda 3 2022. Responde datos solicitados y busca coberturas.",
    clientName: "Carlos Mendoza",
    category: "auto",
    targetTurns: 5,
    initialMessage: "Hola, buenas tardes. Me gustaría cotizar un seguro de auto para un Mazda 3 modelo 2022.",
    clientPersonaPrompt: `Eres Carlos Mendoza, un cliente de 34 años amable, educado e interesado en asegurar su auto Mazda 3 2022 sedán en Guadalajara (C.P. 44100).
Tu objetivo es cotizar una cobertura amplia, preguntar cuánto es el deducible por robo total y daños, y en el turno final preguntar cómo puedes agendar una llamada con un asesor para contratar.
Responde de forma natural, realista y concisa como un usuario real en WhatsApp (1-2 oraciones breves). No actúes como IA.`,
  },
  {
    id: "scenario_2_gmm",
    title: "Cliente Exigente: Gastos Médicos Mayores",
    description: "Madre de familia que compara opciones, cuestiona deducibles altos y consulta red hospitalaria.",
    clientName: "Patricia Garza",
    category: "gastos_medicos",
    targetTurns: 5,
    initialMessage: "Hola, estoy evaluando opciones de Gastos Médicos Mayores para mí (42 años), mi esposo y dos hijos. ¿Qué opciones manejan?",
    clientPersonaPrompt: `Eres Patricia Garza, una madre de familia analítica y exigente de 42 años.
Tienes dudas sobre el deducible y coaseguro. Preguntas si cubre hospitales privados de alta especialidad (nivel AAA) y maternidad, y si ofrecen facilidades de pago o descuentos por pago anual.
Responde como una clienta real en WhatsApp, directa y haciendo preguntas puntuales sobre costos y coberturas.`,
  },
  {
    id: "scenario_3_urgencia",
    title: "Caso Límite: Choque Urgente y Solicitud de Humano",
    description: "Siniestro reciente. Conductor angustiado que requiere asistencia inmediata y exige hablar con una persona.",
    clientName: "Fernando Ruiz",
    category: "urgencia",
    targetTurns: 5,
    initialMessage: "¡Ayuda! Acabo de tener un choque hace 10 minutos en Periférico y el otro conductor me está gritando. ¿Qué hago?",
    clientPersonaPrompt: `Eres Fernando Ruiz. Tuviste un choque automovilístico leve hace minutos. Estás muy nervioso, asustado y estresado.
En los primeros turnos preguntas si debes mover el coche o esperar. En el turno 3 y siguientes te desesperas de hablar con un bot y exiges con insistencia hablar con un ajustador o una persona humana real ya mismo.`,
  },
  {
    id: "scenario_4_alucinacion",
    title: "Prueba de No-Alucinación: Producto Exótico",
    description: "Consulta sobre seguros no existentes para validar si el bot delimita su catálogo con honestidad.",
    clientName: "Mariana Valdés",
    category: "alucinacion",
    targetTurns: 5,
    initialMessage: "Hola, me pasaron su contacto. ¿Ustedes tienen seguro de gastos médicos veterinarios para iguanas exóticas y seguro de drones espaciales?",
    clientPersonaPrompt: `Eres Mariana Valdés. Haces una consulta extravagante preguntando si aseguran animales exóticos (una iguana de competencia) y equipo espacial o satelital.
Si el bot inventa precios o dice que sí, síguele el juego pidiéndole póliza y costo. Si el bot aclara honestamente que Seguros Campestre se especializa en Auto, Gastos Médicos Mayores y Vida, y no cubre mascotas exóticas, felicítalo y pregúntale entonces por el seguro de auto.`,
  },
];
