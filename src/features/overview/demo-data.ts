import { DEMO_CLIENTS } from "@/features/clients/demo-data";

/** Instantánea comercial ficticia. No representa ventas ni una integración real. */
export const COMMERCIAL_SNAPSHOT = {
  periodLabel: "septiembre 2026",
  previousMonth: "agosto",
  previousClients: 1110,
  previousLeads: 289,
  conversionRate: 24.8,
  previousConversionRate: 21.3,
} as const;

export const DEMO_MONTHLY_SALES = [
  { month: "Abr", label: "Abril", value: 24800 },
  { month: "May", label: "Mayo", value: 31200 },
  { month: "Jun", label: "Junio", value: 28750 },
  { month: "Jul", label: "Julio", value: 36450 },
  { month: "Ago", label: "Agosto", value: 42800 },
  { month: "Sep", label: "Septiembre", value: 48520 },
] as const;

export type OpportunityStage = "Nuevo" | "Contactado" | "Propuesta" | "Negociación" | "Ganado";
export type DemoOpportunity = {
  id: string;
  title: string;
  clientId: string;
  client: string;
  company: string;
  value: number;
  stage: OpportunityStage;
  probability: number;
  owner: string;
  description: string;
};

const opportunityDetails = [
  { title: "Plan de crecimiento anual", value: 12800, stage: "Negociación", probability: 80, description: "Propuesta anual de servicios. El equipo está revisando el alcance y las condiciones de inicio." },
  { title: "Renovación de servicios", value: 8400, stage: "Propuesta", probability: 60, description: "Propuesta de renovación enviada. Pendiente de la reunión de revisión con el cliente." },
  { title: "Acompañamiento comercial", value: 6200, stage: "Contactado", probability: 35, description: "Primera reunión realizada. Se están recopilando los requisitos para preparar una propuesta." },
  { title: "Implementación inicial", value: 18500, stage: "Ganado", probability: 100, description: "Propuesta aceptada en este escenario de demostración. Próximo paso: coordinar el inicio del servicio." },
  { title: "Servicios para nueva sede", value: 4800, stage: "Nuevo", probability: 15, description: "Nueva solicitud recibida. Pendiente de la primera conversación para conocer las necesidades." },
] satisfies Pick<DemoOpportunity, "title" | "value" | "stage" | "probability" | "description">[];

export const DEMO_OPPORTUNITIES: DemoOpportunity[] = opportunityDetails.map((opportunity, index) => {
  const client = DEMO_CLIENTS[index];
  return {
    ...opportunity,
    id: `opportunity-${index + 1}`,
    clientId: client.id,
    client: client.name,
    company: client.company,
    owner: client.owner,
  };
});

export type DemoActivity = {
  id: string;
  kind: "created" | "updated" | "deleted" | "opportunity" | "call" | "quote" | "sale";
  title: string;
  detail: string;
  time: string;
  local?: boolean;
};

export const DEMO_ACTIVITIES: DemoActivity[] = [
  { id: "demo-client", kind: "created", title: "Nuevo cliente registrado", detail: `${DEMO_CLIENTS[0].name} · ${DEMO_CLIENTS[0].company}`, time: "10:45" },
  { id: "demo-opportunity", kind: "opportunity", title: "Oportunidad actualizada", detail: `${DEMO_CLIENTS[1].company} pasó a Propuesta`, time: "10:20" },
  { id: "demo-call", kind: "call", title: "Llamada completada", detail: `Seguimiento con ${DEMO_CLIENTS[2].name}`, time: "09:50" },
  { id: "demo-quote", kind: "quote", title: "Cotización enviada", detail: `Plan de crecimiento · ${DEMO_CLIENTS[0].company}`, time: "09:30" },
  { id: "demo-sale", kind: "sale", title: "Venta cerrada", detail: `${DEMO_CLIENTS[3].company} · S/ 18,500`, time: "09:15" },
];
