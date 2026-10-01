import type { Profile } from "@/features/auth/types";

export const SALE_STATES = ["Borrador", "Pendiente", "Pagada", "Cancelada"] as const;
export const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Yape", "Plin", "Otro"] as const;
export type SaleState = typeof SALE_STATES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type Sale = {
  id: string; numero: string; cliente_id: string; oportunidad_id: string | null;
  responsable_id: string | null; estado: SaleState; moneda: "PEN";
  subtotal: string; descuento: string; impuesto: string; total: string; aplica_igv: boolean;
  fecha_venta: string; fecha_pago: string | null; metodo_pago: PaymentMethod | "";
  referencia_pago: string; observaciones: string; motivo_cancelacion: string;
  cancelada_at: string | null; cancelada_por: string | null;
  emitida_at: string | null; created_at: string; updated_at: string;
};
export type SaleItemInput = { descripcion: string; cantidad: string; precio_unitario: string; descuento: string };
export type SaleItem = SaleItemInput & { id: string; venta_id: string; subtotal: string; orden: number; created_at: string };
export type SaveSale = Pick<Sale, "cliente_id" | "oportunidad_id" | "responsable_id" | "estado" | "aplica_igv" | "fecha_venta" | "fecha_pago" | "metodo_pago" | "referencia_pago" | "observaciones">;
export type SaleDetail = { sale: Sale; items: SaleItem[] };
export type SaleResponsible = Pick<Profile, "id" | "nombres" | "apellidos" | "activo" | "rol">;
export type SaleRow = Omit<Sale, "subtotal" | "descuento" | "impuesto" | "total"> & {
  subtotal: string | number; descuento: string | number; impuesto: string | number; total: string | number;
  subtotal_decimal: string; descuento_decimal: string; impuesto_decimal: string; total_decimal: string;
  request_id: string; created_by: string;
};
export type SaleItemRow = Omit<SaleItem, "cantidad" | "precio_unitario" | "descuento" | "subtotal"> & {
  cantidad: string | number; precio_unitario: string | number; descuento: string | number; subtotal: string | number;
  cantidad_decimal: string; precio_decimal: string; descuento_decimal: string; subtotal_decimal: string;
};
export const canEditSale = (sale: Sale) => sale.estado === "Borrador" || sale.estado === "Pendiente";
