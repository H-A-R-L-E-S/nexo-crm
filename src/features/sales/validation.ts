import { decimalMoney } from "@/features/opportunities/money";
import { normalizeQuantity, saleAmounts } from "./calculations";
import { PAYMENT_METHODS, type SaleItemInput, type SaveSale } from "./types";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateSale(input: SaveSale, items: SaleItemInput[]) {
  if (!uuid.test(input.cliente_id)) throw new Error("Selecciona un cliente existente.");
  if (input.oportunidad_id && !uuid.test(input.oportunidad_id)) throw new Error("Selecciona una oportunidad válida.");
  if (input.responsable_id && !uuid.test(input.responsable_id)) throw new Error("Selecciona un responsable válido.");
  if (!["Borrador", "Pendiente", "Pagada"].includes(input.estado)) throw new Error("Selecciona un estado válido. Para cancelar usa la acción correspondiente.");
  if (!validDate(input.fecha_venta)) throw new Error("Ingresa una fecha de venta válida.");
  if (input.estado === "Pagada" && (!input.fecha_pago || !validDate(input.fecha_pago) || !input.metodo_pago)) throw new Error("Para marcar Pagada, completa la fecha y el método de pago.");
  if (input.metodo_pago && !PAYMENT_METHODS.includes(input.metodo_pago)) throw new Error("Selecciona un método de pago válido.");
  if (input.referencia_pago.length > 160 || input.observaciones.length > 3000) throw new Error("Referencia admite 160 caracteres y observaciones 3000.");
  if (items.length < 1 || items.length > 100) throw new Error("Agrega entre 1 y 100 productos o servicios.");
  const normalized = items.map((item, index) => {
    if (!item.descripcion.trim() || item.descripcion.trim().length > 200) throw new Error(`Ítem ${index + 1}: completa una descripción de hasta 200 caracteres.`);
    return { descripcion: item.descripcion.trim(), cantidad: normalizeQuantity(item.cantidad), precio_unitario: decimalMoney(item.precio_unitario), descuento: decimalMoney(item.descuento) };
  });
  saleAmounts(normalized, input.aplica_igv);
  return { input: { ...input, fecha_pago: input.estado === "Pagada" ? input.fecha_pago : null }, items: normalized };
}
