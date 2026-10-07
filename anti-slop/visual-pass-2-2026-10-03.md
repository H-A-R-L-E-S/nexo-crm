# Segunda pasada visual de Nexo CRM

Fecha: 2026-10-03. Modo: during, elección explícita de la sesión. Skills: antislop, antislop-ui, antislop-human y antislop-layoutmobile, leídas desde `.codex/skills/` y aplicadas durante el diseño y en esta auditoría final.

## Resultado y alcance

Base visual implementada: canvas continuo, navegación compacta, métricas abiertas con cartera como foco, seguimiento primero, análisis sin paneles repetidos y distribución por barras en lugar del donut. Claro, Oscuro y Sistema tienen tokens propios y una preferencia persistente. `DESIGN.md` documenta la dirección, las razones y el sistema para fases posteriores.

Se reutilizan marca, iconos, formularios, menús y providers existentes. No se incorporaron dependencias, imágenes generadas, feeds, métricas comerciales nuevas ni datos ficticios a la aplicación. Las capturas usan registros explícitos de prueba.

Cambios de presentación: shell, sidebar, header, resumen, seguimiento dentro del resumen, menú de perfil, botones/badges compartidos, Toaster y CSS global. El menú de perfil conserva sus acciones. Consultas y cálculos de seguimiento se conservan. Los módulos comerciales mantienen su composición y lógica; solo reciben los tokens compartidos. No hay cambios en servicios, modelos, SQL, Supabase, permisos, sesiones, validadores ni rutas. Login mantiene su estructura y lógica.

## Evidencia visual

- [Antes, 1280 px](../artifacts/visual-pass-2/antes.png).
- [Después claro, 1280 px](../artifacts/visual-pass-2/despues-claro.png): mismos ocho registros de prueba que antes.
- [Después oscuro, 1440 px](../artifacts/visual-pass-2/despues-oscuro.png): un registro, para comprobar también poca información.
- [Después móvil, 390 px](../artifacts/visual-pass-2/despues-movil.png).
- [Formulario oscuro, altura reducida 390 × 400 px](../artifacts/visual-pass-2/formulario-altura-reducida.png): Notas y acciones alcanzables.

Las capturas completas de tablet, texto al 200%, Sheet, validación, menús, vacío, error y seguimiento con datos están en las carpetas `after`, `final` y `keyboard` de `artifacts/visual-pass-2/`. Son capturas del servidor de desarrollo; el indicador de Next pertenece a ese entorno. Los artefactos están excluidos de Git por la configuración existente.

## Validación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | PASS, salida 0 después de la última edición de UI. |
| `npm run typecheck` | PASS, tipos de rutas y TypeScript, salida 0. |
| `npm run build` | PASS, compilación de producción y 14 rutas, salida 0. |
| `git diff --check` | PASS, sin errores de whitespace; avisos de conversión LF/CRLF de Git. |
| Suite inicial sin rediseño | 61/63 aprobadas, dos fallos existentes registrados en `before`. |
| Suite completa después | 65/67 aprobadas, ocho casos de resumen/temas incluidos. |
| Repetición de auth, ventas, resumen y temas | 24/25 aprobadas; auth 7/7, ventas 10/10 y resumen 4/4. Falló el nuevo ensayo de reducción de altura por enfocar antes del reajuste. |
| Ensayo final de ambos temas tras ajustar la espera | PASS 1/1: exige el tamaño efectivo del diálogo y visibilidad completa del campo, además de contraste, portales, ocho anchos y texto al 200%. |

Los 25 casos distintos de auth, ventas, resumen y temas tienen resultados aprobados en las ejecuciones finales. No se afirma que la ejecución completa de 67 haya salido sin fallos.

### Fallos separados del resultado visual

- **Demostrados antes de editar:** Oportunidades, error recuperable/conflicto, `tests/opportunities.spec.ts:149`, no aparecía el aviso esperado; Tareas, Vendedor, `tests/tasks.spec.ts:98`, faltaba la fila al recargar tras completar. Ambos pasan en la ejecución completa posterior. No se cambió lógica para hacerlos pasar.
- **Observados después, no reproducidos al repetir:** validación inicial de Login, `tests/auth.spec.ts:20`, envío nativo antes de obtener el aviso; detalle de Venta para Gerente, `tests/sales.spec.ts:145`, encabezado esperado no encontrado. Ambos pasan en la repetición estable sin modificar auth ni ventas. No se etiquetan como fallos preexistentes demostrados.
- **Prueba nueva corregida:** la reducción de viewport requería esperar a `max-height: 360px` antes de enfocar Notas. La repetición exige `toBeInViewport({ ratio: 1 })` y pasa en Claro y Oscuro. No se cambió el formulario ni se forzó scroll desde la prueba.
- **Correcciones de esta fase:** foco de menús sin outline completo, transición de dimensiones táctiles, blancos/selects heredados en oscuro, enlace azul de contraste insuficiente en oscuro y atributo temporal con riesgo de discrepancia de hidratación. Se corrigieron en presentación y se volvieron a verificar. El gráfico corrige también la concordancia para un único cliente.

## Contraste y accesibilidad

`tests/themes.spec.ts` calcula luminancia sRGB y contraste WCAG, resuelve colores computados con canvas (incluido OKLCH) y compone backgrounds con alpha. Verifica texto visible del shell y formulario, tokens sobre cinco superficies, blancos sobre primario, estados y elementos del gráfico. Python no está instalado; se utilizó la fórmula equivalente en JavaScript, sin estimaciones visuales.

| Pareja | Ratio |
| --- | --- |
| Texto claro / canvas | 15.55:1 |
| Texto secundario claro / superficie secundaria | 5.18:1 |
| Borde de campo claro / superficie secundaria | 3.56:1 |
| Blanco / azul primario | 5.17:1 |
| Texto oscuro / canvas | 14.83:1 |
| Texto secundario oscuro / muted | 6.28:1 |
| Enlace oscuro / muted | 7.24:1 |
| Borde de campo oscuro / muted | 3.93:1 |
| Barra azul oscuro / canvas | 7.73:1 |

El foco tiene outline de 2 px, también dentro de menús y portales probados. Se verifican apertura con Enter, selección del tema por teclado, Escape y retorno de foco; labels, opciones radio, `aria-current`, skip link y alternativa tabular del gráfico se conservan o incorporan. Estados usan texto además de color.

## Recorrido funcional registrado

| Control o estado | Evidencia ejecutada |
| --- | --- |
| Sidebar y destinos comerciales | Resumen, Clientes, Leads, Oportunidades, Ventas, Tareas, Configuración y Usuarios; URL y selección activa en `overview-ui`. |
| Permisos del sidebar | Usuarios visible para Administrador y bloqueado para Vendedor/Gerente, suite `users`. |
| Navegación móvil | Abrir, elegir Clientes/Resumen, cierre y menú de perfil, `overview-ui` y `auth`. |
| Calendario, Reportes, Ayuda | Diálogos actuales abren y cierran con Escape; módulos pendientes etiquetados Pronto. |
| Búsqueda | Empresa de prueba conduce a `/clientes?buscar=Empresa%20de%20prueba`. |
| Notificaciones | Abrir, marcar leída, estado Todas leídas deshabilitado, cerrar. |
| Apariencia | Claro/Oscuro/Sistema; teclado, retorno de foco, reload, navegación, nuevo contexto con almacenamiento, cambio del esquema del dispositivo. |
| Primera visualización del tema | Cinco frames con el shell visible conservan el oscuro guardado; consola de la prueba sin errores de hidratación ni pageerror. |
| Perfil y cierre de sesión | Navegación, perfil real, edición, recarga y logout por teclado, `auth`. |
| Métricas y distribución | Cuatro enlaces KPI y tres enlaces por estado conservan destinos/filtros, `themes`. |
| Seguimiento | Hoy, vencidas, Ver tareas y enlace de tarea real de prueba; carga, error y reintento, `overview-ui` y `themes`. |
| Clientes recientes | Ver todos, edición de registro con retorno de foco y formulario existente. |
| Alta y vacío | Nuevo cliente, validación existente, Escape; Registrar primer cliente en vacío. |
| Error de cartera | No muestra cifras provisionales ni vacío; Reintentar clientes recupera datos. |
| Formularios móviles | Sin overflow; campo Notas completamente visible tras reducir altura a 400 px en ambos temas. |

## Delivery Gate del alcance visual

### Bloque 1: Hard Gate

- R-02 PASS: búsqueda en los componentes del alcance, sin raya larga en copy nuevo.
- R-03 PASS: sin overflow de documento a 320, 390, 640, 768, 1024, 1280, 1440 y 1920 px; capturas revisadas y texto al 200% en ambos temas.
- R-17 PASS: medidas proceden del provider de clientes y `taskStats`; sin métricas nuevas inventadas.
- R-18 PASS: no se añadieron testimonios ni personas ficticias a la aplicación.
- R-23 PASS: marca y sistema de iconos reutilizados; alcance de navegación autorizado por el brief; sin assets nuevos generados.
- R-24 PASS: destinos existentes comprobados; Calendario/Reportes mantienen Pronto y diálogos honestos.
- R-25 PASS: fórmula y texto computado verifican 4.5:1 normal, 3:1 grande y 3:1 controles/gráfico; evidencia anterior y assertions en `themes`.
- R-26 PASS: controles del alcance tienen navegación, submit o handlers reales, comprobados en el recorrido registrado.
- R-27 PASS: carga, vacío, error y reintento de cartera/seguimiento probados; no aparecen cifras cero durante carga/error.
- R-28 PASS: no se añadió FAQ al CRM.
- R-32 PASS: Tab/Enter/Escape, outline, radios y retorno de foco probados; semántica y labels inspeccionados.
- R-33 PASS: cambios de fuente mediante patches explícitos; ningún script transforma fuente o CSS de la aplicación.
- R-34 PASS: Claro/Oscuro/Sistema comprobados; portales y selects oscuros legibles, tipografía coherente y superficies heredadas adaptadas.
- R-35 PASS: lint, tipos, build y recorrido ejecutados; resultados y fallos intermitentes documentados sin ocultarlos.
- R-36 PASS: no se incorporaron afirmaciones de seguridad, rendimiento, clientes ni compliance.
- R-37 PASS: dirección derivada del brief y referencia Attio, documentada antes de implementar, con ENERGY 1 / RHYTHM 2 / MOTION 1.
- R-38 PASS: registros de aplicación proceden de providers existentes; fixtures y capturas claramente identificados como prueba; notificación conserva etiqueta de demostración.

### Bloque 2: Purpose-Gate

- R-01 PASS: azul Nexo para acción/selección/datos, neutros para lectura y estados semánticos; razón en `DESIGN.md`, sin gradientes nuevos.
- R-04 PASS: Lucide existente identifica destinos y acciones; se retiran iconos decorativos de KPI, razón documentada.
- R-06 PASS: Segoe UI/sistema para español y lectura comercial; escala de títulos, números y contexto documentada.
- R-07 PASS: canvas plano de lectura; no se traslada el patrón de puntos del marketing de Attio.
- R-08 PASS: sin flechas ornamentales en CTA; chevron del header expresa contexto.
- R-09 PASS: sin pills de promoción; Pronto comunica capacidad pendiente y los estados tienen texto funcional.
- R-10 PASS: sin glass nuevo; overlays compartidos sin backdrop blur.
- R-12 PASS: sombra solo para superposición de menús/diálogos; dashboard abierto sin paneles flotantes.
- R-13 PASS: sin glow decorativo.
- R-14 PASS: no hay feature cards ni cuatro KPI cards repetidas; total y contexto tienen jerarquía distinta.
- R-19 PASS: transiciones breves de color y apertura/cierre Radix; sin animación del contenido, reduced-motion definido.
- R-22 PASS: sin ilustraciones genéricas; el vacío usa mensaje y acción existentes.

### Bloque 3: Liveliness

- Diales PASS: ENERGY 1 / RHYTHM 2 / MOTION 1 explícitos en `DESIGN.md`.
- Coherencia PASS: interfaz serena, composición variada por función y movimiento solo de estados.
- Foco PASS: cartera total domina las cifras; Nuevo cliente es la acción principal; vacío/error tienen acción contextual.
- Espacio PASS: gutters y separadores organizan trabajo, análisis y registros; capturas desktop/tablet/móvil revisadas.
- Acento PASS: azul Nexo único acento de identidad, no usado como color de todos los números.
- Motivo PASS: números tabulares, iniciales compactas y líneas proporcionales conectan cartera, responsables y distribución.
- Design Read PASS: brief empresarial, referencia de precisión de Attio e identidad Nexo transcritos en `DESIGN.md` antes de UI.

### Bloque 4: Craftsmanship y Quality Locks

- C-1 PASS: paleta, tipografía, composición, radio y superficies tienen razones escritas en `DESIGN.md`.
- C-2 PASS: recorrido de enlaces, menús, formularios y controles registrado; funciones pendientes identificadas.
- C-3 PASS: seguimiento primero para decidir qué atender; cartera, crecimiento, responsables y registros usan información existente.
- C-4 PASS: estados, temas, teclado, ocho anchos y texto ampliado verificados dentro del alcance de esta fase.
- C-5 PASS: cálculos y datos existentes; cifras de pruebas identificadas; no se afirman resultados de producción no medidos.
- R-05 PASS: ritmo entre métricas abiertas, seguimiento secundario, análisis y filas; sin bento ni mosaico de cards.
- R-11 PASS: escala de radios 6/8/10 px documentada, sin cápsulas como forma general.
- R-15 PASS: Nuevo cliente, Registrar primer cliente, Ver tareas y Reintentar expresan acciones concretas.
- R-16 PASS: copy operativo en español, sin buzzwords de marketing nuevos.
- R-20 PASS: composición orientada a seguimiento comercial y cartera; marca Nexo, lenguaje de proporciones e iniciales consistentes.
- R-21 PASS: default Sistema y elección persistente, no oscuro forzado.
- R-29 PASS: neutros y azul; rojo/ámbar/verde limitados a estados reales acompañados de texto.
- R-30 PASS: se traslada precisión de Attio, no su landing, marca, tipografía propietaria, workflow ni contenido.
- R-31 PASS: decisiones principales justificadas en una línea en la fuente visual `DESIGN.md`.

## Suplementos de las skills

### antislop-ui

- UI-01 PASS: paleta documentada con pares Claro/Oscuro.
- UI-02 PASS: primario reservado a acción principal; total en neutral.
- UI-03 PASS: sin emoji decorativo nuevo.
- UI-04 PASS: ritmo 2 reflejado en composiciones distintas, capturas antes/después.
- UI-05 PASS: sin bento, terminal falso, pricing ni franjas laterales decorativas.
- UI-06 PASS: encabezado sin pill redundante.
- UI-07 PASS: destinos/handlers y Pronto comprobados en el recorrido.
- UI-08 PASS: transiciones funcionales breves, sin loops nuevos; reduced-motion en CSS.
- UI-09 PASS: sin glass/glow; sombras de overlay, escala de radios documentada.
- UI-10 PASS: indicador de notificación corresponde al estado de aviso de demostración existente.
- UI-11 PASS: seguimiento ocupa la primera columna/primer tramo móvil para priorizar atención.
- UI-12 PASS: cifras, fechas y filas proceden de datos existentes; fixtures rotulados prueba.
- UI-13 PASS: formularios existentes conservan campos vacíos y ejemplos honestos.
- UI-14 PASS: carga con texto, error con reintento, vacío con siguiente acción.
- UI-15 PASS: pruebas y revisión de temas, estados, reflow y teclado dentro del alcance.

### antislop-human

- HUMAN-01 PASS: contraste mediante fórmula y colores computados, no inspección a ojo.
- HUMAN-02 PASS: input/focus y elementos de gráfico ≥3:1; texto de estado ≥4.5:1, separadores suaves sin función de control.
- HUMAN-03 PASS: outline de 2 px, contrastado en ambos temas; foco de tema y formulario visible en capturas/pruebas.
- HUMAN-04 PASS: radios por Enter, navegación por teclado, Escape y retorno de foco; labels y semántica inspeccionados.
- HUMAN-05 PASS: vacío/carga/error perceptibles con texto y acciones probadas.
- HUMAN-06 PASS: texto al 200% sin overflow; campo completo en viewport reducido tras reajuste, sin scroll forzado por el test.

### antislop-layoutmobile

- MOBILE-01 PASS: Sheet y header en dos filas, indicadores 2×2 y trabajo primero.
- MOBILE-02 PASS: estados intermedios definidos; analítica se empareja desde 640, sidebar desde 1024, workspace se divide desde 1280.
- MOBILE-03 PASS: margen móvil 16 px frente a desktop 36, cifras/espaciado adaptados y type en rem.
- MOBILE-04 PASS: tracks `minmax(0,1fr)` y apilado del workspace al faltar ancho.
- MOBILE-05 PASS: ocho anchos y 200% sin scroll horizontal del documento ni clipping de controles.
- MOBILE-06 PASS: header medido ≥44×44 en móvil; nav, botones, cierres e inputs con mínimos táctiles y separación en CSS.
- MOBILE-07 PASS: menús y acciones abren por click/teclado, sin dependencia de hover; estados active definidos.
- MOBILE-08 PASS: navegación móvil etiquetada Menú, destinos y perfil disponibles.
- MOBILE-09 PASS: header sin fijación sobre contenido, Sheet con scroll, shell en unidades svh y formulario existente limitado por dvh.
- MOBILE-10 PASS: 320–1920 px, tablet 768, móvil 390 y altura 400 probados y capturados.

## Límites de la evidencia

Verificación en Edge/Chromium local con servidor de pruebas. La reducción de viewport representa el espacio disponible al aparecer un teclado; no certifica teclados físicos ni Safari/Firefox. Se revisaron superficies compartidas de Clientes, Leads, Oportunidades, Ventas, Tareas, Usuarios, Configuración y Perfil en oscuro, sin afirmar una auditoría profunda de esos módulos. No se ejecutaron operaciones sobre producción ni se verificaron políticas RLS reales. El alcance visual de esta fase supera los cuatro bloques del gate; los fallos intermitentes de la suite completa quedan documentados para seguimiento.
