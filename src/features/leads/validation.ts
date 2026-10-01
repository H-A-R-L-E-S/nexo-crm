import { LEAD_ESTADOS, LEAD_FUENTES, LEAD_PRIORIDADES, type NuevoLead } from "./types";

export function validateLead(input: NuevoLead) {
  if (input.nombres.trim().length < 2 || input.nombres.trim().length > 80) throw new Error("Nombres: ingresa entre 2 y 80 caracteres.");
  if (input.apellidos.length > 100 || input.empresa.length > 100 || input.cargo.length > 100) throw new Error("Apellidos, empresa y cargo admiten hasta 100 caracteres.");
  if (input.correo && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.correo) || input.correo.length > 254)) throw new Error("Ingresa un correo electrónico válido o deja el campo vacío.");
  if (!/^[+\d\s().-]+$/.test(input.telefono) || input.telefono.length > 30 || !/^\d{7,15}$/.test(input.telefono.replace(/\D/g, ""))) throw new Error("Ingresa un teléfono válido de 7 a 15 dígitos.");
  if (!LEAD_ESTADOS.includes(input.estado) || !LEAD_FUENTES.includes(input.fuente) || !LEAD_PRIORIDADES.includes(input.prioridad)) throw new Error("Selecciona un estado, una fuente y una prioridad válidos.");
  if (input.notas.length > 1500) throw new Error("Las notas admiten hasta 1500 caracteres.");
  return { ...input, nombres: input.nombres.trim(), apellidos: input.apellidos.trim(), correo: input.correo.trim().toLowerCase() };
}
