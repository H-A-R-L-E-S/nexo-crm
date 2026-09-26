const numberFormat = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatNumber(value: number) {
  return numberFormat.format(value);
}

export function formatMoney(value: number) {
  return `S/ ${numberFormat.format(value)}`;
}

export function formatPercent(value: number) {
  return `${decimalFormat.format(value)}%`;
}

export function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
