import { decimalMoney } from "./money";
import { isClosed, OPPORTUNITY_STAGES, STAGE_PROBABILITY, type CreateOpportunity } from "./types";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateOpportunity(input: CreateOpportunity): CreateOpportunity {
  if (input.titulo.trim().length < 2 || input.titulo.trim().length > 160) throw new Error("Título: ingresa entre 2 y 160 caracteres.");
  if (!uuid.test(input.cliente_id)) throw new Error("Selecciona un cliente existente.");
  if (input.lead_id && !uuid.test(input.lead_id)) throw new Error("Selecciona un lead válido.");
  if (input.responsable_id && !uuid.test(input.responsable_id)) throw new Error("Selecciona un responsable válido.");
  if (!OPPORTUNITY_STAGES.includes(input.etapa)) throw new Error("Selecciona una etapa válida.");
  if (!Number.isInteger(input.probabilidad) || input.probabilidad < 0 || input.probabilidad > 100) throw new Error("La probabilidad debe ser un entero entre 0 y 100.");
  if (input.descripcion.length > 3000 || input.origen.length > 100) throw new Error("Descripción admite 3000 caracteres y origen 100.");
  if (input.fecha_cierre_estimada && (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha_cierre_estimada) || !Number.isFinite(Date.parse(input.fecha_cierre_estimada)) || new Date(input.fecha_cierre_estimada).toISOString().slice(0, 10) !== input.fecha_cierre_estimada)) throw new Error("Ingresa una fecha de cierre válida.");
  return { ...input, titulo: input.titulo.trim(), valor: decimalMoney(input.valor), probabilidad: isClosed(input.etapa) ? STAGE_PROBABILITY[input.etapa] : input.probabilidad };
}
