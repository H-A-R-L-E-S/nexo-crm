import { decimalMoney, toCents } from "@/features/opportunities/money";
import type { SaleItemInput } from "./types";

export const MAX_CENTS = BigInt("99999999999999");
export function quantityUnits(value: string): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(normalized)) throw new Error("Cantidad: ingresa hasta 9 enteros y 3 decimales, sin separadores de miles.");
  const [whole, fraction = ""] = normalized.split(".");
  const units = BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
  if (units <= BigInt(0)) throw new Error("La cantidad debe ser mayor que cero.");
  return units;
}
export function normalizeQuantity(value: string) {
  const units = quantityUnits(value);
  return `${units / BigInt(1000)}.${String(units % BigInt(1000)).padStart(3, "0")}`;
}
export function centsDecimal(value: bigint) { return `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`; }
export function itemAmounts(item: SaleItemInput) {
  const subtotal = (quantityUnits(item.cantidad) * toCents(decimalMoney(item.precio_unitario)) + BigInt(500)) / BigInt(1000);
  const discount = toCents(decimalMoney(item.descuento));
  if (subtotal > MAX_CENTS) throw new Error("El importe del ítem supera el máximo permitido.");
  if (discount > subtotal) throw new Error("El descuento de un ítem no puede superar su importe.");
  return { subtotal, discount, net: subtotal - discount };
}
export function saleAmounts(items: SaleItemInput[], igv: boolean) {
  let subtotal = BigInt(0), discount = BigInt(0);
  for (const item of items) { const result = itemAmounts(item); subtotal += result.subtotal; discount += result.discount; }
  const net = subtotal - discount;
  const tax = igv ? (net * BigInt(18) + BigInt(50)) / BigInt(100) : BigInt(0);
  const total = net + tax;
  if ([subtotal, discount, tax, total].some((value) => value > MAX_CENTS)) throw new Error("El total supera el máximo permitido para una venta.");
  return { subtotal, discount, tax, total };
}
