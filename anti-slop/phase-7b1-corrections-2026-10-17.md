# Fase 7B.1: correcciones de exactitud, estabilidad y calidad visual

Fecha: 2026-10-17
Alcance autorizado: F-01, F-09 y F-11

## 1. Resumen ejecutivo

Los tres hallazgos autorizados quedaron corregidos y verificados. Reportes distingue fechas PostgreSQL `date` de instantes `timestamptz`; las rutas descendientes del segmento CRM cuentan con recuperación accesible ante errores inesperados; Ventas diferencia carga, error, indisponibilidad y valores monetarios válidos iguales a cero. No se cambiaron autenticación, sesiones, roles, permisos, RLS, SQL, migraciones ni cálculos comerciales.

## 2. Diagnóstico inicial

- F-01: `limaDateKey` convertía cualquier string mediante `new Date`. Un `date` como `2026-10-01` se interpretaba como medianoche UTC y pasaba a `2026-09-30` en Lima.
- F-09: `src/app/(crm)` no contenía `error.tsx`; los errores de consultas estaban manejados, pero no los fallos inesperados de renderizado de páginas y segmentos descendientes.
- F-11: las métricas de Ventas mostraban un em dash tanto durante la carga como ante error, sin comunicar el estado real y sin distinguir un cero válido.

La línea base registrada antes de la fase era 129 pruebas Playwright aprobadas. El árbol ya contenía archivos no versionados de auditorías y evidencias anteriores; se conservaron. Tres capturas versionadas de Usuarios que Playwright sobrescribió durante la suite fueron restauradas exactamente a `HEAD` por estar fuera de alcance.

## 3. Causa raíz de F-01

PostgreSQL `date` representa un día de calendario sin hora ni zona. JavaScript, en cambio, interpreta el formato ISO corto como un instante UTC al construir un `Date`. Aplicar después `America/Lima` resta cinco horas y puede cambiar el día. Los `timestamptz` sí representan instantes y necesitan conversión de zona. El defecto provenía de tratar ambas categorías con la misma función.

## 4. Corrección de fechas

- Se añadió `calendarDateKey`, que acepta únicamente un calendario válido `YYYY-MM-DD`, comprueba años bisiestos y devuelve el mismo día sin conversión horaria.
- `fecha_venta`, `fecha_pago` y `fecha_vencimiento` se comparan como fechas de calendario.
- `created_at`, `updatedAt` y `completada_at` mantienen conversión del instante real a `America/Lima` mediante `limaDateKey`.
- Los límites de período siguen generándose a partir del día efectivo de Lima.
- No se cambió ningún tipo SQL, importe, descuento, IGV ni regla comercial.

Las regresiones cubren primer y último día del mes, septiembre/octubre, diciembre/enero, año bisiesto, `date`, `timestamptz`, medianoche UTC, medianoche de Lima, fecha de venta, fecha de pago, selección de período y nombre del CSV. El caso original `2026-10-01` permanece en octubre.

## 5. Corrección del manejo de errores

Se creó `src/app/(crm)/error.tsx` como Client Component según la guía instalada de Next.js 16.3.6. Usa la prop vigente `retry()` para reintentar el segmento, ofrece un enlace seguro al resumen y no muestra `message`, stack, digest, claves ni detalles internos. El identificador de digest solo se envía al registro técnico del navegador.

La pantalla reutiliza tokens y botones existentes. Tiene `role="alert"`, encabezado asociado, foco global visible, botones de al menos 44 px, reflow móvil, compatibilidad Claro/Oscuro/Sistema, zoom al 200 %, forced colors y reduced motion.

Alcance real: el límite protege `page`, `loading`, layouts anidados y demás descendientes del segmento `(crm)`. Por convención de App Router, no captura errores lanzados por `src/app/(crm)/layout.tsx` en el mismo nivel. Por eso `requireProfile` y sus redirecciones legítimas de autenticación o acceso no fueron interceptadas ni sustituidas.

Para probar el fallo sin tocar datos reales se añadió `/prueba-limite-error`, disponible únicamente cuando `NEXO_E2E_ERROR_PROBE=enabled`; fuera del entorno Playwright responde 404. El probe provoca un único error de render cliente y permite comprobar recuperación. No cambia autenticación ni permisos.

## 6. Corrección de Ventas

Las métricas ahora presentan:

- `Cargando` mientras la consulta inicial está pendiente.
- `No disponible` cuando existe un error o no hay información utilizable.
- El valor real cuando la consulta termina, incluido `S/ 0.00` y el conteo `0`.

El resumen usa `aria-live="polite"`, conserva `aria-busy`, el formato PEN, los cálculos existentes y la composición visual. Solo se ajustó el tamaño y color tipográfico de los textos de estado con tokens ya existentes.

## 7. Archivos modificados

- `playwright.config.ts`
- `src/features/reports/metrics.ts`
- `src/features/sales/sales-view.tsx`
- `src/features/sales/sales.module.css`
- `src/app/(crm)/error.tsx`
- `src/app/(crm)/error.module.css`
- `src/app/(crm)/prueba-limite-error/page.tsx`
- `src/app/(crm)/prueba-limite-error/probe.tsx`
- `tests/reports.spec.ts`
- `tests/sales.spec.ts`
- `tests/error-boundary.spec.ts`
- `anti-slop/phase-7b1-corrections-2026-10-17.md`

`DESIGN.md` no se modificó porque no se introdujo un patrón visual general nuevo.

## 8. Nuevas pruebas

Se añadieron cinco pruebas Playwright, elevando el total de 129 a 134:

1. Fechas `date` y `timestamptz` en límites de Lima, meses, años y bisiestos.
2. Nombre de CSV consistente con el período seleccionado.
3. Carga, error, recuperación y cero válido en las métricas de Ventas.
4. Fallo inesperado, ausencia de información sensible, teclado y reintento del límite CRM.
5. Navegación segura, 320 px, zoom al 200 % en 390 px y temas Claro/Oscuro/Sistema.

Después de la suite completa se reforzó la quinta prueba con los tres temas y zoom; esa prueba específica volvió a pasar junto con la prueba de recuperación.

## 9. Resultado de lint

`npm run lint`: PASS. ESLint terminó sin errores ni advertencias.

## 10. Resultado de typecheck

`npm run typecheck`: PASS. `next typegen` y `tsc --noEmit` terminaron correctamente.

## 11. Resultado de build

`npm run build`: PASS fuera del sandbox, después de que el intento interno compilara pero fallara con `spawn EPERM` al crear el proceso de TypeScript. Next.js 16.3.6 compiló, comprobó tipos y generó 17 rutas.

Advertencia preexistente: Next detecta `C:\Users\Usuario\package-lock.json` fuera del repositorio y recomienda fijar la raíz. Corresponde a F-10 y no se corrigió por estar expresamente fuera del alcance.

## 12. Resultado de Playwright

`npm run test:e2e`: PASS, 134 aprobadas, 0 fallidas, Chromium, 1 worker, 10,5 minutos.

Validación específica posterior del límite CRM: 2 aprobadas, 0 fallidas, 23,8 segundos. Esta repetición confirmó los tres temas, reflow móvil y zoom después del último refuerzo de la prueba.

## 13. Auditoría de las cuatro skills Anti Slop

Design Read aplicado: recuperación de fallos del CRM empresarial Nexo con la identidad azul y las superficies existentes. ENERGY 3 / RHYTHM 2 / MOTION 2.

### Core antislop

- R-02 PASS en el alcance: no queda em dash como placeholder en Ventas ni en la nueva pantalla.
- R-26 PASS: Reintentar ejecuta `retry()` y Volver al resumen navega a `/`.
- R-27 PASS: Ventas diferencia carga, vacío/lista sin datos, error y valores reales; el segmento CRM añade fallback para errores inesperados.
- R-34 PASS: Claro, Oscuro y Sistema se comprobaron en el límite y en la suite general.
- R-35 PASS: lint, typecheck, build y click-through automatizado se ejecutaron.
- R-37 PASS: se respetaron `DESIGN.md` y los diales vigentes del CRM.

### antislop-ui

- Se reutilizaron paleta, tokens, radios y botones existentes.
- El azul identifica la acción y el marcador de error; no se añadió gradiente, glass, glow, iconografía decorativa ni un sistema paralelo.
- Razones visuales: el marcador localiza el fallback sin revelar detalles; la superficie abierta mantiene continuidad con el CRM; la jerarquía tipográfica dirige primero al diagnóstico y después a las dos acciones.

### antislop-human

- Mensaje textual, no dependiente del color, con `role="alert"` y título asociado.
- Reintento accesible por Tab y Enter; foco visible heredado y objetivos de al menos 44 px.
- Textos de estado de Ventas anunciados mediante región ocupada y `aria-live` cortés.
- Zoom al 200 % verificado en 390 px; no se muestran secretos ni información interna.

### antislop-layoutmobile

- Acciones en fila cuando caben y apiladas a ancho estrecho.
- 320 px sin overflow; 390 px con texto al 200 % sin overflow.
- Controles táctiles de al menos 44 por 44 px y sin interacción exclusiva de hover.

### Delivery Gate

- Hard Gate PASS: no hay placeholder con em dash, overflow en la matriz verificada, datos inventados, enlaces muertos, controles inertes ni detalles sensibles visibles.
- Purpose Gate PASS: el único acento y el marcador sirven a jerarquía y recuperación; no hay decoración sin propósito.
- Liveliness PASS: diales declarados, un foco principal, espacio estructural, azul Nexo como acento e identidad tipográfica existente.
- Craftsmanship PASS: las acciones funcionan, los estados están completos, los tres temas mantienen la interfaz y no se añadieron afirmaciones ni contenido ficticio.

## 14. Riesgos y limitaciones pendientes

- El `error.tsx` del segmento no captura fallos del layout del mismo segmento; es una limitación documentada de Next.js, no una omisión silenciosa.
- La advertencia de raíz de Next continúa pendiente como F-10.
- La suite general sigue ejecutándose solo en Chromium; la brecha WebKit/Firefox de la auditoría 7A permanece fuera de alcance.
- F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-10 y F-12 no fueron corregidos.

## 15. Confirmación de alcance y seguridad

No se modificaron Supabase Auth, RLS, roles, permisos, sesiones, proxy, middleware, esquema SQL, migraciones, contratos comerciales, cálculos de IGV, descuentos, idempotencia ni concurrencia. Tampoco se sustituyeron responsables ficticios de Clientes. No se ejecutó `supabase/schema.sql`, no se modificó `.env.local` y no se realizó commit ni push.

F-01, F-09 y F-11 están cerrados con evidencia. La Fase 7B.1 queda lista para revisión del diff y guardado en GitHub.
