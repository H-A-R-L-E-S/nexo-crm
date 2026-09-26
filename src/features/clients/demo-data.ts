import type { Client, ClientStatus } from "./types";

/** Fecha de referencia fija para que todos los indicadores de la demo coincidan. */
export const DEMO_TODAY = "2026-09-25";

export const OWNERS = [
  { name: "Ana García", initials: "AG" },
  { name: "Carlos Mendoza", initials: "CM" },
  { name: "Lucía Torres", initials: "LT" },
] as const;

/** Datos totalmente ficticios. Este archivo podrá sustituirse por un repositorio de Supabase. */
const SEED_CLIENTS: Omit<Client, "firstName" | "lastName" | "position" | "address" | "notes" | "lastContact">[] = [
  {
    id: "cli-001",
    name: "Valeria Rojas",
    company: "Andes Estudio",
    email: "valeria.rojas@example.com",
    phone: "+51 987 654 321",
    status: "Activo",
    owner: "Ana García",
    createdAt: "2026-09-24",
    updatedAt: "2026-09-25",
  },
  {
    id: "cli-002",
    name: "Diego Salazar",
    company: "Costa Verde Digital",
    email: "diego.salazar@example.com",
    phone: "+51 956 812 430",
    status: "Prospecto",
    owner: "Carlos Mendoza",
    createdAt: "2026-09-20",
    updatedAt: "2026-09-24",
  },
  {
    id: "cli-003",
    name: "Camila Mendoza",
    company: "Kantu Textiles",
    email: "camila.mendoza@example.com",
    phone: "+51 945 621 803",
    status: "Activo",
    owner: "Lucía Torres",
    createdAt: "2026-09-14",
    updatedAt: "2026-09-23",
  },
  {
    id: "cli-004",
    name: "Sebastián Flores",
    company: "Puna Logística",
    email: "sebastian.flores@example.com",
    phone: "+51 923 456 781",
    status: "Prospecto",
    owner: "Ana García",
    createdAt: "2026-09-05",
    updatedAt: "2026-09-22",
  },
  {
    id: "cli-005",
    name: "Mariana Castillo",
    company: "Brisa Café",
    email: "mariana.castillo@example.com",
    phone: "+51 978 532 146",
    status: "Activo",
    owner: "Lucía Torres",
    createdAt: "2026-08-28",
    updatedAt: "2026-09-21",
  },
  {
    id: "cli-006",
    name: "Gabriel Vargas",
    company: "Sierra Norte Alimentos",
    email: "gabriel.vargas@example.com",
    phone: "+51 964 781 235",
    status: "Activo",
    owner: "Carlos Mendoza",
    createdAt: "2026-08-18",
    updatedAt: "2026-09-20",
  },
  {
    id: "cli-007",
    name: "Luciana Paredes",
    company: "Marea Arquitectura",
    email: "luciana.paredes@example.com",
    phone: "+51 932 845 617",
    status: "Prospecto",
    owner: "Ana García",
    createdAt: "2026-08-12",
    updatedAt: "2026-09-18",
  },
  {
    id: "cli-008",
    name: "Andrés Huamán",
    company: "Inti Soluciones",
    email: "andres.huaman@example.com",
    phone: "+51 951 637 284",
    status: "Activo",
    owner: "Carlos Mendoza",
    createdAt: "2026-08-04",
    updatedAt: "2026-09-17",
  },
  {
    id: "cli-009",
    name: "Paola Medina",
    company: "Lima Jardín",
    email: "paola.medina@example.com",
    phone: "+51 986 214 573",
    status: "Inactivo",
    owner: "Lucía Torres",
    createdAt: "2026-07-25",
    updatedAt: "2026-09-12",
  },
  {
    id: "cli-010",
    name: "Rodrigo Vega",
    company: "Qori Equipamiento",
    email: "rodrigo.vega@example.com",
    phone: "+51 974 852 316",
    status: "Activo",
    owner: "Ana García",
    createdAt: "2026-07-16",
    updatedAt: "2026-09-10",
  },
  {
    id: "cli-011",
    name: "Fernanda Chávez",
    company: "Río Claro Consultores",
    email: "fernanda.chavez@example.com",
    phone: "+51 963 147 825",
    status: "Prospecto",
    owner: "Lucía Torres",
    createdAt: "2026-07-08",
    updatedAt: "2026-09-08",
  },
  {
    id: "cli-012",
    name: "Nicolás Gutiérrez",
    company: "Surco Creativo",
    email: "nicolas.gutierrez@example.com",
    phone: "+51 942 583 176",
    status: "Activo",
    owner: "Carlos Mendoza",
    createdAt: "2026-06-26",
    updatedAt: "2026-09-07",
  },
  {
    id: "cli-013",
    name: "Daniela Torres",
    company: "Nube Andina",
    email: "daniela.torres@example.com",
    phone: "+51 955 728 461",
    status: "Activo",
    owner: "Ana García",
    createdAt: "2026-06-18",
    updatedAt: "2026-09-05",
  },
  {
    id: "cli-014",
    name: "Mateo Espinoza",
    company: "Pacífico Taller",
    email: "mateo.espinoza@example.com",
    phone: "+51 981 643 257",
    status: "Inactivo",
    owner: "Carlos Mendoza",
    createdAt: "2026-06-04",
    updatedAt: "2026-08-27",
  },
  {
    id: "cli-015",
    name: "Alejandra Núñez",
    company: "Tierra Buena Mercado",
    email: "alejandra.nunez@example.com",
    phone: "+51 934 716 852",
    status: "Activo",
    owner: "Lucía Torres",
    createdAt: "2026-05-22",
    updatedAt: "2026-08-24",
  },
  {
    id: "cli-016",
    name: "Joaquín Reyes",
    company: "Origen Empaques",
    email: "joaquin.reyes@example.com",
    phone: "+51 967 425 183",
    status: "Prospecto",
    owner: "Carlos Mendoza",
    createdAt: "2026-05-09",
    updatedAt: "2026-08-20",
  },
  {
    id: "cli-017",
    name: "Isabella Romero",
    company: "Alto Valle Diseño",
    email: "isabella.romero@example.com",
    phone: "+51 948 362 715",
    status: "Activo",
    owner: "Ana García",
    createdAt: "2026-04-21",
    updatedAt: "2026-08-16",
  },
  {
    id: "cli-018",
    name: "Tomás Aguilar",
    company: "Sauce Eventos",
    email: "tomas.aguilar@example.com",
    phone: "+51 976 581 432",
    status: "Inactivo",
    owner: "Lucía Torres",
    createdAt: "2026-04-08",
    updatedAt: "2026-08-11",
  },
];

const FIRST_NAMES = ["Carlos", "Andrea", "Luis", "Mariana", "Diego", "Valeria", "Lucía", "Javier", "Gabriela", "Daniel", "Sofía", "Miguel", "Claudia", "Renato", "Patricia", "Eduardo", "Adriana", "Alonso", "Carolina", "José", "Elena", "Martín", "Teresa", "Felipe"];
const LAST_NAMES = ["Mendoza", "Torres", "Ramírez", "López", "Fernández", "Rojas", "Salazar", "Flores", "Vargas", "Paredes", "Medina", "Vega", "Chávez", "Gutiérrez", "Núñez", "Reyes", "Romero", "Aguilar", "Castillo", "Huamán", "Espinoza", "Soto", "Díaz", "Campos"];
const COMPANY_NAMES = ["Nova Andina", "Valle Norte", "Horizonte Azul", "Cumbre Sur", "Puente Verde", "Norte Creativo", "Lago Claro", "Sendero Andino", "Costa Serena", "Prado Digital", "Raíz Peruana", "Luz del Valle", "Piedra Blanca", "Mundo Qori", "Viento Sur", "Camino Inti", "Bosque Vivo", "Litoral", "Alameda", "Punto Lima"];
const COMPANY_SECTORS = ["Consultores", "Soluciones", "Comercial", "Estudio", "Servicios", "Tecnología"];
const POSITIONS = ["Gerente general", "Jefa de compras", "Director comercial", "Coordinadora de operaciones", "Responsable de marketing", "Gerente de proyectos"];
const DISTRICTS = ["Miraflores, Lima", "San Isidro, Lima", "Cayma, Arequipa", "Víctor Larco, Trujillo", "Wanchaq, Cusco", "Castilla, Piura"];

// Distribución determinista: 842 activos, 326 prospectos y 80 inactivos.
const generatedStatuses: ClientStatus[] = [
  ...Array<ClientStatus>(832).fill("Activo"),
  ...Array<ClientStatus>(321).fill("Prospecto"),
  ...Array<ClientStatus>(77).fill("Inactivo"),
];

function generatedDate(index: number) {
  // 134 altas generadas en septiembre + 4 semillas = 138 de 1,248 clientes.
  const month = index < 134 ? 9 : 4 + (index % 5);
  const day = 1 + (index % (month === 9 ? 25 : 28));
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const seededClients: Client[] = SEED_CLIENTS.map((client, index) => {
  const [firstName, ...lastNames] = client.name.split(" ");
  return {
    ...client,
    firstName,
    lastName: lastNames.join(" "),
    position: POSITIONS[index % POSITIONS.length],
    address: `Av. Los Álamos ${120 + index * 17}, ${DISTRICTS[index % DISTRICTS.length]}`,
    notes: "Contacto ficticio para explorar las funciones de Nexo CRM.",
    lastContact: client.updatedAt,
  };
});

const generatedClients: Client[] = Array.from({ length: 1230 }, (_, index) => {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = `${LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]} ${LAST_NAMES[(index + Math.floor(index / 576) + 7) % LAST_NAMES.length]}`;
  const company = `${COMPANY_NAMES[index % COMPANY_NAMES.length]} ${COMPANY_SECTORS[Math.floor(index / COMPANY_NAMES.length) % COMPANY_SECTORS.length]}`;
  const createdAt = generatedDate(index);
  const suffix = String(index + 19).padStart(4, "0");
  return {
    id: `cli-${suffix}`,
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    company,
    email: `contacto.${suffix}@example.com`,
    phone: `+51 9${String(10000000 + index * 137).padStart(8, "0")}`,
    status: generatedStatuses[(index * 17) % generatedStatuses.length],
    owner: OWNERS[index % OWNERS.length].name,
    position: POSITIONS[index % POSITIONS.length],
    address: `Av. Los Cedros ${200 + index}, ${DISTRICTS[index % DISTRICTS.length]}`,
    notes: index % 3 === 0 ? "Cliente de demostración. Interés en una propuesta personalizada." : "",
    lastContact: index % 7 === 0 ? null : DEMO_TODAY,
    createdAt,
    updatedAt: DEMO_TODAY,
  };
});

export const DEMO_CLIENTS: Client[] = [...seededClients, ...generatedClients];
