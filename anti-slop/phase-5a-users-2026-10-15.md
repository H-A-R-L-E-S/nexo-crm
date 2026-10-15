# Fase 5A · Usuarios

Fecha: 2026-10-15  
Alcance: `/configuracion/usuarios` y sus componentes visuales  
Design Read: módulo administrativo de equipo para responsables de Nexo, con lenguaje comercial preciso y profundidad azul controlada. ENERGY 3 / RHYTHM 2 / MOTION 2.

## Estado encontrado

El árbol de trabajo estaba limpio y `main` coincidía con `origin/main` en `87edfa5`, último commit de la Fase 4. No había cambios locales de una ejecución anterior ni un informe de Fase 5A que recuperar. El módulo existente ya tenía altas, edición, activación, inactivación, filtros, paginación, validación y comprobaciones de servidor, pero su presentación seguía siendo la anterior: cinco tarjetas KPI equivalentes, tabla de escritorio con scroll en móvil, estilos dispersos y loading de ruta genérico.

## Implementación completada

- Encabezado con contexto de Configuración, propósito del módulo y alta como acción principal.
- Resumen jerárquico con total real, accesos activos/inactivos y distribución real por rol. Sustituye cinco tarjetas idénticas por una superficie continua.
- Directorio con búsqueda, filtros existentes, filtros activos eliminables, recarga, resultado visible y paginación.
- Tabla completa en desktop y fichas adaptadas en tablet/móvil. Las acciones, el correo, el rol, el estado y la fecha permanecen visibles sin overflow de página.
- Roles y estados con texto, no solo color. Administrador conserva una señal distintiva por su impacto de permisos.
- Formularios de alta y edición reorganizados, con área de acciones fija al desplazarse, contraseña visible/oculta, notas de seguridad y errores perceptibles.
- Confirmación de activar/inactivar con acción semántica y retorno de foco provisto por Radix.
- Estados de ruta, carga de datos, vacío, filtros sin resultados, error y éxito. Los éxitos conservan los toasts existentes.
- Motion limitado a recarga, skeleton y transiciones de estado; `prefers-reduced-motion` los elimina.
- Light, Dark y System conservan los tokens y el provider existentes.
- Reflow comprobado a 320, 390, 768, 1024 y 1440 px; texto al 200 % sin overflow horizontal.

## Archivos modificados

- `src/app/(crm)/configuracion/usuarios/loading.tsx`
- `src/features/users/users-view.tsx`
- `src/features/users/users-table.tsx`
- `src/features/users/user-form.tsx`
- `src/features/users/user-status.tsx`
- `src/features/users/users.module.css` (nuevo)
- `tests/users.spec.ts`
- `anti-slop/users-evidence/users-light-desktop.png` (nuevo)
- `anti-slop/users-evidence/users-dark-mobile.png` (nuevo)
- `anti-slop/users-evidence/users-system-tablet.png` (nuevo)
- `anti-slop/phase-5a-users-2026-10-15.md` (nuevo)

## Funcionalidad y seguridad preservadas

No se modificaron `actions.ts`, `service.ts`, `validation.ts`, `types.ts`, Auth, Supabase, SQL, RLS, sesiones, servicios, consultas, contratos, rutas ni reglas comerciales. La página continúa usando `requireProfile()` e `isAdmin()` antes de renderizar. Las Server Actions vuelven a crear un `adminContext()` y el servicio sigue impidiendo retirar el rol del propio Administrador o desactivar su cuenta. Administrador, Gerente y Vendedor conservan su diferencia funcional.

Las pruebas administrativas usaron exclusivamente el servidor simulado de `tests/support/auth-server.mjs`. No se modificaron cuentas reales.

## Resultados de validación

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | PASS, 0 errores |
| `npm run typecheck` | PASS, tipos de rutas generados y `tsc --noEmit` limpio |
| `npm run build` | PASS, 14/14 páginas estáticas generadas; ruta de Usuarios dinámica |
| `npm run test:e2e -- tests/users.spec.ts` | PASS, 11 aprobadas, 0 fallidas, 1.5 min |
| Prueba visual final específica | PASS, 1 aprobada, 0 fallidas, 15.1 s |
| `git diff --check` | PASS |

El build mostró el aviso preexistente de que Next.js ignora `C:\Users\Usuario\package-lock.json` por estar fuera del repositorio. No afectó la compilación.

La primera ejecución base se solapó con el reemplazo de archivos y no se usa como resultado final: produjo una navegación abortada por hot reload. Una ejecución posterior sobre código estable aprobó las 11 pruebas.

## Cobertura funcional

Las 11 pruebas finales cubren:

1. búsqueda, filtro por rol, filtros sin resultados y limpieza;
2. alta con mock, selección de rol y persistencia visual;
3. edición, correo de solo lectura y cambio de rol;
4. cancelar y confirmar inactivación, persistencia tras recarga y reactivación;
5. contraseña, confirmación, correo duplicado y mostrar contraseña;
6. protección visual del propio Administrador;
7. rechazo de Server Action manipulada por Vendedor;
8. rechazo del intento manipulado de retirar el rol al propio Administrador;
9. ausencia de navegación y redirección para Gerente y Vendedor;
10. alta parcial segura e inactivación de una sesión abierta;
11. diálogo móvil, Escape, retorno de foco, temas, responsive, zoom, overflow y reduced motion.

## Responsive y accesibilidad

- 320 a 639 px: una columna, CTA y controles al ancho disponible, fichas por usuario y objetivos táctiles globales de 44 px.
- 640 a 1100 px: fichas en dos columnas cuando cabe; se evita una tabla comprimida o recortada.
- Más de 1100 px: tabla de seis columnas con jerarquía de lectura y acciones completas.
- Orden DOM coherente, encabezados de tabla con `scope`, caption accesible, regiones etiquetadas, estados `role=status` o `role=alert`, nombres accesibles y foco visible.
- Los estados se expresan con texto además de color. Pares medidos: activo claro 6.50:1, activo oscuro 7.90:1, texto secundario claro 6.04:1, texto secundario oscuro 8.44:1 y enlaces/acento entre 5.43:1 y 5.45:1.
- La prueba automatizada confirmó cero overflow de página a 320, 768, 1024 y 1440 px, también con fuente raíz al 200 %.

## Decisiones visuales y propósito

- Azul Nexo: identifica alta, foco, selección y Administrador, que son los puntos de decisión; no se distribuye como decoración.
- Resumen continuo: el total es la referencia y los roles lo explican; evita cinco tarjetas con el mismo peso.
- Superficie elevada solo para el directorio: reúne la tarea principal y expresa un único nivel de trabajo.
- Tabla en desktop y fichas en tablet/móvil: conserva densidad donde cabe y legibilidad donde no.
- Radios moderados: diferencian superficie, control, estado e identidad sin convertir todo en cápsula.
- Glass limitado al header global y al footer fijo del diálogo; comunica capas superpuestas.
- Tipografía Segoe UI existente: mantiene continuidad empresarial y legibilidad en español.
- Motion breve: confirma recarga o cambio de estado; no hay loops decorativos.

## Auditoría Anti Slop final

### Hard Gate

- R-02 PASS: no hay em dash en el copy añadido.
- R-03 PASS: Playwright verificó reflow y ausencia de overflow, incluido 200 %.
- R-17/R-18/R-36/R-38 PASS: cifras, usuarios, roles y estados proceden de datos; no hay claims ni personas inventadas.
- R-23 PASS: no se crearon assets, navegación ni contenido realista nuevo.
- R-24/R-26 PASS: controles conservan comportamiento real; no hay enlaces o botones muertos.
- R-25 PASS: pares principales medidos por fórmula WCAG, todos por encima de 4.5:1.
- R-27 PASS: carga, vacío, sin resultados, error y éxito son perceptibles.
- R-32 PASS: Tab, Enter y Escape se apoyan en controles nativos/Radix; retorno de foco probado.
- R-34 PASS: Claro, Oscuro y Sistema se probaron con el provider existente.
- R-35 PASS: build y click-through automatizado final ejecutados.

### Purpose, liveliness y craftsmanship

- R-01/R-10/R-12/R-13 PASS: el degradado leve separa el resumen del canvas; glass y sombra solo expresan superposición o superficie principal; no hay glow.
- R-04/R-09/R-14 PASS: iconos ligados a acciones/roles, sin badges decorativos ni cuadrícula de tarjetas clonadas.
- R-05/R-20 PASS: la jerarquía responde a administrar acceso y responsabilidad, con resumen subordinado al directorio.
- R-11/R-29 PASS: radios y paleta siguen los tokens Nexo.
- R-19 PASS: motion coherente con MOTION 2 y eliminado con reduced motion.
- Liveliness PASS: ENERGY 3 / RHYTHM 2 / MOTION 2, un foco principal por pantalla, azul como acento deliberado y la identidad compacta de iniciales como motivo repetido.
- C-1 a C-5 PASS: decisiones documentadas, controles funcionales, contenido necesario, estados/responsive verificados y datos no fabricados.

Resultado final de auditoría: PASS.

## Limitaciones reales

- La prueba no emula un teclado virtual móvil real; verifica scroll, altura dinámica del diálogo y foco con viewport móvil.
- El modo Sistema se validó con preferencia de sistema clara en esta pasada; el cambio reactivo del sistema ya pertenece a la suite global de temas.
- Los estados de error de listado dependen de fallos del servicio existente. Se preservó y revisó su UI, pero el mock de Usuarios no expone un control dedicado para forzar ese GET sin ampliar el contrato de pruebas.
- No existe recuperación de contraseña ni invitación automática dentro de este módulo. Se mantiene fuera del alcance y se comunica la contraseña temporal por canal seguro, tal como ya indicaba el flujo.
