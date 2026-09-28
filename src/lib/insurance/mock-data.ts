export type InsuranceBranch = "auto" | "gastos_medicos" | "vida" | "hogar" | "empresa";

export type LeadStatus = "nuevo" | "pendiente_asesor" | "en_atencion" | "poliza_emitida" | "perdido";

export type PolicyStatus = "activa" | "por_renovar" | "renovada" | "cancelada";

export interface Advisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: InsuranceBranch;
  branchLabel: string;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  sender: "client" | "bot" | "advisor";
  text: string;
  time: string;
}

export interface InsuranceLead {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  insuranceType: InsuranceBranch;
  branchLabel: string;
  status: LeadStatus;
  statusLabel: string;
  qualificationData: {
    itemOrProfile?: string; // ej. "Mazda 3 2022 i Touring" o "Familia 3 personas (34, 32 y 4 años)"
    zipCode?: string;
    coverageDesired?: string;
    preferredCompanies?: string[];
    estimatedBudget?: string;
    botSummary?: string;
  };
  assignedAdvisor: Advisor;
  notes?: string;
  createdAt: string;
  transcript: ChatMessage[];
}

export interface InsurancePolicy {
  id: string;
  leadId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  policyNumber: string;
  insuranceCompany: "GNP" | "AXA" | "Mapfre" | "MetLife" | "Quálitas" | "Seguros Monterrey";
  insuranceType: InsuranceBranch;
  branchLabel: string;
  premiumAmount: number; // en MXN
  startDate: string;
  endDate: string; // Fecha de renovación
  status: PolicyStatus;
  daysUntilExpiration: number;
  assignedAdvisor: Advisor;
}

export const ADVISORS: Advisor[] = [
  {
    id: "adv-1",
    name: "Carlos Ruiz",
    email: "carlos.autos@tuagencia.com",
    phone: "+52 55 1234 5678",
    branch: "auto",
    branchLabel: "Especialista en Autos",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "adv-2",
    name: "Dra. Mariana Valdés",
    email: "mariana.salud@tuagencia.com",
    phone: "+52 55 9876 5432",
    branch: "gastos_medicos",
    branchLabel: "Especialista en Gastos Médicos",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "adv-3",
    name: "Lic. Fernando Gómez",
    email: "fernando.vida@tuagencia.com",
    phone: "+52 55 4444 8888",
    branch: "vida",
    branchLabel: "Especialista en Vida y Retiro",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
  },
];

export const INITIAL_LEADS: InsuranceLead[] = [
  {
    id: "lead-101",
    clientName: "Carlos Mendoza",
    clientPhone: "+52 55 7890 1234",
    clientEmail: "cmendoza@gmail.com",
    insuranceType: "auto",
    branchLabel: "Seguro de Auto",
    status: "pendiente_asesor",
    statusLabel: "Pendiente de Asesor",
    qualificationData: {
      itemOrProfile: "Mazda 3 Sedán 2022 i Touring Automático",
      zipCode: "03100 (CDMX - Benito Juárez)",
      coverageDesired: "Cobertura Amplia (Deducible 5% / 10%)",
      preferredCompanies: ["Quálitas", "GNP", "AXA"],
      estimatedBudget: "$12,000 - $15,000 MXN",
      botSummary: "Prospecto busca comparativa urgente para renovar póliza que vence este fin de mes. Vehículo particular sin siniestros previos.",
    },
    assignedAdvisor: ADVISORS[0],
    createdAt: "Hoy, hace 18 min",
    transcript: [
      { id: "t1", sender: "client", text: "Hola buenas tardes, me pasaron su contacto. Quiero cotizar un seguro para mi coche.", time: "14:20" },
      { id: "t2", sender: "bot", text: "¡Hola Carlos! Bienvenido a Aseguradora Central. Con gusto te ayudo a encontrar la mejor opción. ¿Qué año, marca y modelo es tu auto?", time: "14:20" },
      { id: "t3", sender: "client", text: "Es un Mazda 3 sedán modelo 2022, versión i Touring automático.", time: "14:21" },
      { id: "t4", sender: "bot", text: "¿En qué código postal circula habitualmente y qué tipo de cobertura te interesa (Amplia, Plus o Limitada)?", time: "14:21" },
      { id: "t5", sender: "client", text: "Circulo en CDMX, CP 03100. Quiero Cobertura Amplia con deducible del 5%.", time: "14:22" },
      { id: "t6", sender: "bot", text: "¡Excelente Carlos! Ya registré los datos de tu Mazda 3. He generado tu ficha y transferí la solicitud a nuestro especialista en Autos, Carlos Ruiz. En breve te enviará por WhatsApp las 3 mejores opciones comparadas entre GNP, Quálitas y AXA.", time: "14:23" },
      { id: "t7", sender: "client", text: "Muchas gracias, quedo al pendiente.", time: "14:23" },
    ],
  },
  {
    id: "lead-102",
    clientName: "Patricia Morales",
    clientPhone: "+52 55 6543 2109",
    clientEmail: "patricia.morales@techcorp.com",
    insuranceType: "gastos_medicos",
    branchLabel: "Gastos Médicos Mayores",
    status: "en_atencion",
    statusLabel: "En Atención / Cotización",
    qualificationData: {
      itemOrProfile: "Familia de 3 (Titular 35a, Cónyuge 33a, Hijo 3a)",
      zipCode: "64000 (Monterrey, NL)",
      coverageDesired: "Nivel Hospitalario Alto (Médica Sur, Ángeles, Zambrano Hellion)",
      preferredCompanies: ["AXA", "MetLife", "GNP"],
      estimatedBudget: "$35,000 - $45,000 MXN anual",
      botSummary: "Familia joven con hijo pequeño. Buscan plan familiar integral sin periodo de espera en padecimientos infantiles comunes.",
    },
    assignedAdvisor: ADVISORS[1],
    createdAt: "Ayer a las 17:40",
    transcript: [
      { id: "t20", sender: "client", text: "Buenas tardes, quiero informes sobre una póliza de gastos médicos mayores para mi familia.", time: "17:40" },
      { id: "t21", sender: "bot", text: "¡Hola Patricia! Qué importante decisión para proteger a tu familia. ¿Para cuántos integrantes sería el seguro y cuáles son sus edades aproximadas?", time: "17:40" },
      { id: "t22", sender: "client", text: "Somos 3: mi esposo de 33, yo de 35 y nuestro hijo de 3 años. Vivimos en Monterrey.", time: "17:41" },
      { id: "t23", sender: "bot", text: "Perfecto. ¿Tienen algún hospital de preferencia en Monterrey como Hospital Zambrano Hellion o San José?", time: "17:42" },
      { id: "t24", sender: "client", text: "Sí, queremos que incluya el Zambrano Hellion y Hospital Ángeles.", time: "17:42" },
      { id: "t25", sender: "bot", text: "¡Excelente! He enviado tu expediente a la Dra. Mariana Valdés, especialista en Salud. Ella preparará un cuadro comparativo entre AXA Flex Plus y GNP Línea Azul y te contactará por WhatsApp.", time: "17:43" },
    ],
  },
  {
    id: "lead-103",
    clientName: "Ing. Jorge Villalobos",
    clientPhone: "+52 55 3322 1100",
    clientEmail: "jvillalobos@inversiones.mx",
    insuranceType: "vida",
    branchLabel: "Vida & Ahorro PPR",
    status: "poliza_emitida",
    statusLabel: "Póliza Emitida (Venta Cerrada)",
    qualificationData: {
      itemOrProfile: "Plan Personal de Retiro + Seguro de Vida 42 años",
      zipCode: "44100 (Guadalajara, JAL)",
      coverageDesired: "Suma asegurada $3,000,000 MXN + Aportación deducible de impuestos",
      preferredCompanies: ["Seguros Monterrey", "MetLife"],
      estimatedBudget: "$50,000 MXN anual deducible",
      botSummary: "Empresario independiente, busca beneficio fiscal Art. 151 LISR para deducción personal en declaración anual y protección para 2 hijas.",
    },
    assignedAdvisor: ADVISORS[2],
    createdAt: "Hace 3 días",
    transcript: [
      { id: "t30", sender: "client", text: "Hola, me interesa armar un plan de retiro que sea deducible de impuestos y me dé seguro de vida.", time: "10:15" },
      { id: "t31", sender: "bot", text: "¡Hola Ing. Villalobos! Excelente estrategia financiera. Los planes PPR bajo el artículo 151 te permiten deducir hasta el 10% de tus ingresos anuales. ¿Cuál es tu edad actual?", time: "10:15" },
      { id: "t32", sender: "client", text: "Tengo 42 años y me gustaría proyectar una aportación anual de alrededor de 50 mil pesos.", time: "10:16" },
      { id: "t33", sender: "bot", text: "He canalizado tu solicitud con el Lic. Fernando Gómez, nuestro especialista en Vida y Retiro, quien te enviará la corrida financiera personalizada.", time: "10:17" },
    ],
  },
  {
    id: "lead-104",
    clientName: "Valeria Domínguez",
    clientPhone: "+52 55 9988 7766",
    clientEmail: "valeria.dom@outlook.com",
    insuranceType: "auto",
    branchLabel: "Seguro de Auto",
    status: "nuevo",
    statusLabel: "Nuevo (Bot Calificando)",
    qualificationData: {
      itemOrProfile: "Nissan Kicks 2023 Exclusive",
      zipCode: "76000 (Querétaro)",
      coverageDesired: "Cobertura Amplia",
      preferredCompanies: ["GNP", "Mapfre"],
      estimatedBudget: "Por definir",
      botSummary: "El bot está solicitando el código postal y versión del vehículo.",
    },
    assignedAdvisor: ADVISORS[0],
    createdAt: "Hace 5 min",
    transcript: [
      { id: "t40", sender: "client", text: "Hola, acabo de comprar una Nissan Kicks y quiero cotizar seguro.", time: "14:35" },
      { id: "t41", sender: "bot", text: "¡Felicidades por tu camioneta Valeria! ¿Qué modelo de año es tu Kicks y en qué ciudad circularás principalmente?", time: "14:35" },
      { id: "t42", sender: "client", text: "Es 2023 versión Exclusive, en Querétaro.", time: "14:36" },
      { id: "t43", sender: "bot", text: "¿Prefieres cobertura amplia con seguro de autopartes y auto sustituto?", time: "14:36" },
    ],
  },
  {
    id: "lead-105",
    clientName: "Rodrigo Salazar",
    clientPhone: "+52 55 1199 8822",
    clientEmail: "rodrigo.s@empresa.com",
    insuranceType: "gastos_medicos",
    branchLabel: "Gastos Médicos Mayores",
    status: "perdido",
    statusLabel: "Perdido",
    qualificationData: {
      itemOrProfile: "Individual 29 años",
      zipCode: "01000 (CDMX)",
      coverageDesired: "Básica",
      estimatedBudget: "$15,000 MXN",
      botSummary: "El prospecto declinó la cotización debido a que su empresa le otorgó seguro corporativo.",
    },
    assignedAdvisor: ADVISORS[1],
    createdAt: "Hace 5 días",
    transcript: [
      { id: "t50", sender: "client", text: "Hola, ¿cuánto cuesta un seguro de gastos médicos para alguien de 29 años?", time: "11:00" },
      { id: "t51", sender: "bot", text: "¡Hola Rodrigo! Para tu rango de edad, las pólizas individuales rondan entre 14 mil y 19 mil pesos anuales con excelente nivel. He notificado a la Dra. Mariana.", time: "11:01" },
      { id: "t52", sender: "client", text: "Gracias, pero justo hoy me dieron la prestación en mi nuevo trabajo, ya no lo necesitaré por ahora.", time: "11:30" },
    ],
  },
];

export const INITIAL_POLICIES: InsurancePolicy[] = [
  {
    id: "pol-001",
    leadId: "lead-103",
    clientName: "Ing. Jorge Villalobos",
    clientPhone: "+52 55 3322 1100",
    clientEmail: "jvillalobos@inversiones.mx",
    policyNumber: "MET-VID-442190",
    insuranceCompany: "MetLife",
    insuranceType: "vida",
    branchLabel: "Vida & Ahorro PPR",
    premiumAmount: 28500,
    startDate: "2025-09-25",
    endDate: "2026-09-25",
    status: "por_renovar",
    daysUntilExpiration: 14,
    assignedAdvisor: ADVISORS[2],
  },
  {
    id: "pol-002",
    clientName: "Lic. Andrea Morales Garza",
    clientPhone: "+52 55 8899 0011",
    clientEmail: "andrea.morales@legal.com",
    policyNumber: "GNP-AUT-982312",
    insuranceCompany: "GNP",
    insuranceType: "auto",
    branchLabel: "Seguro de Auto",
    premiumAmount: 14200,
    startDate: "2025-10-02",
    endDate: "2026-10-02",
    status: "por_renovar",
    daysUntilExpiration: 21,
    assignedAdvisor: ADVISORS[0],
  },
  {
    id: "pol-003",
    clientName: "Dra. Sofia Benítez Cárdenas",
    clientPhone: "+52 55 4433 2211",
    clientEmail: "dra.benitez@saludintegral.mx",
    policyNumber: "AXA-GMM-771234",
    insuranceCompany: "AXA",
    insuranceType: "gastos_medicos",
    branchLabel: "Gastos Médicos Mayores",
    premiumAmount: 36800,
    startDate: "2026-03-15",
    endDate: "2027-03-15",
    status: "activa",
    daysUntilExpiration: 185,
    assignedAdvisor: ADVISORS[1],
  },
  {
    id: "pol-004",
    clientName: "Arq. Armando Quintero",
    clientPhone: "+52 55 7766 5544",
    clientEmail: "quintero.arq@estudio.com",
    policyNumber: "QUA-AUT-102948",
    insuranceCompany: "Quálitas",
    insuranceType: "auto",
    branchLabel: "Seguro de Auto",
    premiumAmount: 16400,
    startDate: "2026-01-10",
    endDate: "2027-01-10",
    status: "activa",
    daysUntilExpiration: 121,
    assignedAdvisor: ADVISORS[0],
  },
  {
    id: "pol-005",
    clientName: "Familia Elizondo Cantú",
    clientPhone: "+52 55 2211 0099",
    clientEmail: "elizondo.cantu@gmail.com",
    policyNumber: "SM-VID-883921",
    insuranceCompany: "Seguros Monterrey",
    insuranceType: "vida",
    branchLabel: "Vida & Ahorro",
    premiumAmount: 48000,
    startDate: "2025-08-10",
    endDate: "2026-08-10",
    status: "renovada",
    daysUntilExpiration: 333,
    assignedAdvisor: ADVISORS[2],
  },
];
