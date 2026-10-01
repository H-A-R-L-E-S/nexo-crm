const integers = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
export function toCents(value: string): bigint {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) throw new Error("Valor: ingresa un importe positivo o cero, hasta 12 enteros y 2 decimales, sin separadores de miles.");
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(decimal.padEnd(2, "0"));
}
export function decimalMoney(value: string): string {
  const cents = toCents(value.trim().replace(",", "."));
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
export function formatCents(cents: bigint): string {
  return `S/ ${integers.format(cents / BigInt(100))}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
export const formatMoney = (value: string) => formatCents(toCents(value));
