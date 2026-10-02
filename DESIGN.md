# Nexo CRM · Sistema visual

## Dirección

CRM empresarial para equipos comerciales que necesitan revisar su cartera y decidir qué cliente o seguimiento atender. La dirección proviene del brief: conservar la identidad azul y mejorar la claridad, la densidad y el acabado profesional de la interfaz existente.

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1.

## Inspección del proyecto

- `src/app`: App Router, grupo protegido `(crm)`, páginas y estados de carga por módulo. Se conservan las rutas y sus layouts de autenticación.
- `src/components/layout`: Brand, AppShell, Sidebar, Header y WorkspaceDialog. Son la base de la Fase 1.
- `src/components/ui`: primitivas shadcn/Radix para botones, campos, tablas, menús, sheets, diálogos, confirmaciones y avisos. Se reutilizan sin agregar bibliotecas.
- `src/features`: auth, clients, leads, opportunities, sales, tasks, users y overview. Los servicios, validaciones, permisos, cálculos y acciones permanecen fuera del rediseño.
- `src/lib`: utilidades, formatos y clientes de Supabase. No se modifican.
- Tailwind 4 mediante PostCSS; tokens en `src/app/globals.css`; shadcn `radix-nova`; fuente local Segoe UI; iconos Lucide existentes.
- Playwright dispone de servidor local de prueba y casos de autenticación, permisos y CRUD. Ninguna prueba necesita escribir en Supabase real.

## Problemas encontrados

1. Paneles blancos, bordes y sombras repetidos producen poca jerarquía; las cuatro métricas compiten por igual.
2. Iconos y avatares con colores arbitrarios diluyen el azul de Nexo.
3. Mensajes motivacionales y detalles de infraestructura ocupan espacio operativo.
4. Textos de ayuda describen módulos implementados como demostraciones futuras.
5. El resumen puede mostrar ceros y estados vacíos mientras todavía carga o tras un error; falta reintento allí.
6. La lista de responsables incluye nombres procedentes de datos de demostración aunque no tengan clientes asignados.
7. Etiquetas pequeñas, texto slate-400 y áreas de interacción menores de 44 px dificultan lectura y uso móvil.
8. El gráfico se encoge como una imagen en móvil; las etiquetas pierden legibilidad.
9. La combinación de menú, buscador y usuario necesita una composición explícita para tablet y móvil.

## Color e identidad

| Uso | Color | Razón |
| --- | --- | --- |
| Azul principal | `#2563eb` | Conserva la identidad existente; acción principal y selección. |
| Azul de enlaces | `#1d4ed8` | Texto de acciones legible sobre blanco y azul pálido. |
| Fondo | `#f6f8fc` | Separa el espacio de trabajo de las superficies de datos. |
| Superficie | `#ffffff` | Facilita lectura prolongada de listas y gráficos. |
| Texto principal | `#17243b` | Contraste alto con un matiz cercano al azul de marca. |
| Texto secundario | `#475569` | Mantiene legibilidad en tamaños pequeños. |
| Separadores | `#e2e8f0` | Delimitan filas sin dar peso innecesario a cada bloque. |
| Borde de controles | `#64748b` | Permite reconocer campos y botones de contorno. |

Verde, ámbar y rojo se reservan para estados reales, siempre acompañados de texto. El motivo de identidad es el monograma N existente, el azul de selección y los números tabulares de la cartera. No se crean logos, fotos ni datos ficticios.

## Tipografía, espacio y superficies

- Segoe UI y fuentes de sistema existentes: continuidad visual y sin descargas adicionales.
- Título de página 24–28 px; títulos de sección 14–16 px; cuerpo 14 px; contexto 12–13 px. Pesos 400, 500 y 600.
- Números tabulares para cantidades, porcentajes y fechas; la cartera total tiene el mayor énfasis dentro de las métricas.
- Escala de separación 4, 8, 12, 16, 24 y 32 px. Márgenes de contenido 16 px en móvil, 24 px en tablet y 32 px en escritorio.
- Radio 6–8 px en controles y 10 px en superficies. Sin gradientes, brillos ni sombras en paneles normales. Sombra reservada para menús y diálogos superpuestos.
- Bordes para entradas y separadores de listas; un contenedor común para las métricas evita cuatro tarjetas aisladas.
- Lucide se conserva por coherencia con los módulos actuales; los iconos identifican módulos y acciones, sin adornos motivacionales.

## Layout y navegación

- Sidebar de 240 px, monograma existente, contexto de empresa sin tarjeta adicional y navegación de altura uniforme.
- Estado activo azul con texto y `aria-current`; Configuración y Usuarios conservan sus destinos y permisos actuales.
- Calendario y Reportes conservan su diálogo «Pronto». Ayuda continúa como diálogo.
- Header compacto: módulo actual, búsqueda de clientes y controles existentes. En móvil, botón de menú con etiqueta y búsqueda en una segunda fila.
- Contenido con anchura máxima de 1600 px; sin cambios a los proveedores o al layout protegido.

## Resumen

- Franja de métricas: total de cartera como referencia principal; activos, prospectos y nuevas altas como detalles. Se conservan cálculos y enlaces.
- Crecimiento: barras por mes con etiquetas HTML legibles y tabla accesible; azul uniforme y mes actual identificado por texto. Una consulta de contenedor cambia a barras horizontales por filas cuando el ancho no alcanza, incluido el uso con texto ampliado.
- Distribución: lista con cantidades y porcentajes que complementa el gráfico. El color nunca es la única fuente de información.
- Clientes recientes: nombre, empresa, estado y fecha; reutiliza el formulario existente al seleccionar una fila.
- Seguimientos: conserva servicio, cálculos y filtros existentes, con estados de carga y error perceptibles.
- Responsables: muestra únicamente asignaciones presentes en la cartera; no representa datos de demostración como un equipo real.
- Carga: texto contextual y sin ceros aparentes. Error: explicación y reintento usando `reload` existente. Vacío: explicación y acción para registrar el primer cliente.

## Responsive y accesibilidad

- Móvil: métricas apiladas, navegación en sheet, listas que ajustan texto y controles de 44 px.
- Tablet: métricas en dos columnas; bloques principales apilados hasta disponer de ancho suficiente.
- Escritorio: métricas en cuatro columnas y crecimiento junto a distribución; listas y seguimientos en columnas proporcionadas.
- Sin scroll horizontal de página; tablas de otros módulos conservan sus contenedores de scroll.
- Focus visible de 2 px, contraste AA, navegación por Tab/Enter/Escape y retorno de foco de Radix.
- Estados con `role=status` o `role=alert`; el gráfico tiene alternativa textual. Respeto a reduced-motion y forced-colors.
- No se introduce tema oscuro, animación de contenido ni pulso de carga. Se conservan las transiciones breves de apertura y cierre de las primitivas Radix para comunicar sus estados.

## Alcance y verificaciones

Fase 1: AppShell, Sidebar, Header, presentación de Overview y TasksOverview, tokens de foco y controles compartidos. La ayuda se actualiza para reflejar las capacidades existentes.

Fases posteriores: aplicar estos criterios a tablas, filtros y formularios específicos de Clientes, Leads, Oportunidades, Ventas, Tareas y Usuarios sin cambiar sus operaciones.

Verificación: lint, typecheck, build y suite Playwright existente; pruebas adicionales de navegación, estados de resumen, móvil/tablet/escritorio, foco, diálogos y contraste. Capturas locales antes y después para inspección visual. El informe de entrega registra evidencia y límites de las comprobaciones.
