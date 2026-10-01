import { getSupabaseClient } from "@/lib/supabase/client";
import { validateSale } from "../validation";
import type { Sale, SaleDetail, SaleItem, SaleItemInput, SaleResponsible, SaleState, SaveSale } from "../types";

const selection = "id,numero,cliente_id,oportunidad_id,responsable_id,estado,moneda,subtotal:subtotal_decimal,descuento:descuento_decimal,impuesto:impuesto_decimal,total:total_decimal,aplica_igv,fecha_venta,fecha_pago,metodo_pago,referencia_pago,observaciones,motivo_cancelacion,cancelada_at,cancelada_por,emitida_at,created_at,updated_at";
const itemSelection = "id,venta_id,orden,descripcion,cantidad:cantidad_decimal,precio_unitario:precio_decimal,descuento:descuento_decimal,subtotal:subtotal_decimal,created_at";
function fail(error: { code?: string; message: string }): never {
  if (["42501", "22023", "40001", "P0002"].includes(error.code ?? "")) throw new Error(error.message);
  if (["23514", "22003", "22P02", "22007", "22008"].includes(error.code ?? "")) throw new Error("Revisa los datos, fechas, cantidades e importes de la venta.");
  if (error.code === "23503") throw new Error("El cliente, oportunidad o responsable ya no está disponible. Actualiza antes de continuar.");
  if (error.code === "PGRST301" || error.code === "PGRST303") { window.location.replace("/login?motivo=sesion"); throw new Error("Tu sesión terminó. Inicia sesión nuevamente."); }
  throw new Error("No se pudo completar la operación de ventas. Revisa tu conexión o contacta al administrador.");
}
export async function getSales(): Promise<Sale[]> {
  const result: Sale[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseClient().from("ventas").select(selection).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) fail(error);
    result.push(...data);
    if (data.length < 500) return result;
  }
}
export async function getSaleById(id: string): Promise<Sale | null> {
  const { data, error } = await getSupabaseClient().from("ventas").select(selection).eq("id", id).maybeSingle();
  if (error) fail(error);
  return data;
}
export async function getSaleItems(id: string): Promise<SaleItem[]> {
  const { data, error } = await getSupabaseClient().from("venta_items").select(itemSelection).eq("venta_id", id).order("orden");
  if (error) fail(error);
  return data;
}
export async function getSaleDetail(id: string): Promise<SaleDetail> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await getSaleById(id);
    if (!before) throw new Error("La venta no está disponible o ya fue eliminada.");
    const items = await getSaleItems(id);
    const after = await getSaleById(id);
    if (after && before.updated_at === after.updated_at) return { sale: after, items };
  }
  throw new Error("La venta está cambiando. Vuelve a cargar su detalle.");
}
export async function getSaleResponsibles(): Promise<SaleResponsible[]> {
  const { data, error } = await getSupabaseClient().rpc("sale_responsibles");
  if (error) fail(error);
  return data;
}
export async function saveSale(input: SaveSale, items: SaleItemInput[], requestId: string, sale?: Sale): Promise<SaleDetail> {
  const normalized = validateSale(input, items);
  const { data: id, error } = await getSupabaseClient().rpc("save_sale", { p_id: sale?.id ?? null, p_updated_at: sale?.updated_at ?? null, p_request_id: requestId, p_data: normalized.input, p_items: normalized.items });
  if (error) fail(error);
  try { return await getSaleDetail(id); }
  catch { throw new Error("La venta se guardó, pero no pudimos recuperar su detalle. Cierra el formulario y actualiza la lista antes de seguir editando."); }
}
export async function changeSaleStatus(sale: Sale, state: SaleState, payment: { date?: string; method?: string; reference?: string; reason?: string } = {}): Promise<Sale> {
  const { data: id, error } = await getSupabaseClient().rpc("set_sale_status", { p_id: sale.id, p_estado: state, p_updated_at: sale.updated_at, p_fecha_pago: payment.date || null, p_metodo_pago: payment.method ?? "", p_referencia_pago: payment.reference ?? "", p_motivo: payment.reason ?? "" });
  if (error) fail(error);
  const saved = await getSaleById(id);
  if (!saved) throw new Error("La operación terminó. Actualiza la lista para comprobar su resultado.");
  return saved;
}
export async function deleteSale(sale: Sale): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc("delete_sale", { p_id: sale.id, p_updated_at: sale.updated_at });
  if (error?.code === "23503") throw new Error("La venta tiene tareas relacionadas. Cancélala para conservar el historial.");
  if (error) fail(error);
  if (!data) throw new Error("No se eliminó la venta. Actualiza la lista.");
}
