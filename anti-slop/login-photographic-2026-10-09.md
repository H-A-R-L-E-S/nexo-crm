# Login fotográfico de Nexo CRM

Fecha: 9 de octubre de 2026. Alcance exclusivo: presentación e interacción visual del login. Antislop, UI, human y layoutmobile se aplican durante esta sesión, según la elección explícita del usuario. Estado final: PASS. Auditoría y Delivery Gate cerrados por el agente principal; cero pruebas pendientes.

## Estrategia y asset

La referencia principal es la fotografía industrial del usuario. La nueva lámpara es raster, con metal negro texturado, reflejos direccionales, latón, vidrio y filamentos. El atlas contiene dos fotografías alineadas del mismo objeto: apagada y encendida. La transparencia permite colocar el objeto directamente sobre la escena sin recuadro.

Asset integrado: `src/features/auth/assets/lamp-realistic-atlas-v1.webp`, 1536×1024, alpha, 154258 bytes (150.6 KiB), dos estados de 768×1024. El encuadre recorta solo margen transparente inferior hasta 900 px mediante CSS; no se estira el objeto. WebP quality90/alpha100, sin nueva dependencia. La herramienta imagegen integrada creó el asset; Sharp existente se usó para su optimización de formato. Su original queda conservado en el directorio generado de Codex.

El asset se importa estáticamente y se sirve desde `_next/static/media`, ruta ya excluida del proxy. Next/Image conserva las dimensiones y sirve el WebP optimizado directamente, con carga eager. No se modifica Auth ni el proxy para exponerlo.

Prompt empleado: referencia 1 como objeto fotográfico principal; referencia 2 como contraste con el SVG anterior; atlas transparente de dos frames con geometría/cámara/cable iguales, metal negro con grano y desgaste mínimo, anillos de latón, vidrio Edison, estado apagado sin emisión y estado encendido con filamento naranja/amarillo, interior metálico iluminado y bloom local. Se excluyen fondo, suelo, humo y haz pintados para componerlos en la app. Sin texto, bordes ni checkerboard incrustado.

## Decisiones con propósito

| Decisión | Razón |
| --- | --- |
| Fotografía raster | El material y vidrio responden al estándar del usuario y eliminan la apariencia de dibujo vectorial. |
| Un atlas con alpha | Mantiene posición/escala al conmutar y requiere un único recurso compartido por las capas. |
| Filamento extraído de la imagen iluminada | El flicker conserva textura real en lugar de dibujar una bombilla nueva con CSS. |
| Afterglow local de tungsteno | El apagado conserva una emisión cálida breve después de atenuar el acceso. |
| Haz en tres capas con máscaras suaves | Describe dispersión y expansión gradual sin triángulo de borde sólido. |
| Bloom y reflejo cálido sobre el panel | La lámpara afecta visualmente a la escena y al formulario. |
| Neblina débil y 42 motas irregulares | Sugieren volumen y profundidad; movimiento lento y finito. |
| Scrim estable en instrucciones y herramientas | Mantiene legibilidad durante el cambio de luminosidad en modo claro. |
| Glass azulado en el acceso | Integra el formulario; evita una tarjeta blanca separada de la escena. |
| Reflejo detrás del contenido | La luz modifica la superficie del vidrio, preservando el color y contraste de texto, campos y controles. |
| Segoe UI existente | Conserva la voz y métricas de lectura del CRM sin descargar otra familia. |
| Azul mineral, metal negro y oro cálido | El azul mantiene la identidad Nexo; el oro identifica la luz de tungsteno de la referencia. |
| Dos columnas en desktop y pila en tablet/móvil | La lámpara introduce el acceso; el formulario recibe ancho útil en pantallas pequeñas. |
| Separación en rem y margen inferior seguro | La lectura puede ampliarse y los campos pueden desplazarse por encima de un viewport corto. |
| Radios distintos en panel y controles | La superficie de acceso se distingue de los elementos operables, sin convertirlos en cápsulas. |
| Iconos existentes de apariencia, contraseña y acceso | Sol, luna, monitor y ojo describen sus controles; la flecha del único submit indica entrada al espacio de trabajo. |
| Indicador pequeño de foco junto a la lámpara | Hace visible el control de teclado sin encerrar el objeto en un gran rectángulo. |
| 1100 ms de encendido | Filamento, interior, halo, haz y ambiente preceden a la disponibilidad del acceso. |
| Tokens existentes de motion | Se extiende la coreografía local usando duraciones y curvas ya instaladas. |
| Formulario montado y disponibilidad visual separada | Conserva valores; el teclado accede al formulario cuando termina el reveal y sale de él al apagar. |

## Animaciones

- Filamento: flicker local de 210 ms, progresión 0 → .35 → .10 → .65 → .45 → 1.
- Interior fotográfico: crossfade del estado iluminado, retrasado respecto al inicio del filamento.
- Halo y haz: entrada escalonada por opacity/transform; bloom y filtros son estáticos.
- Polvo y neblina: desplazamiento muy lento, finito y localizado en la luz.
- Lámpara: oscilación amortiguada inferior a medio grado, una vez por encendido.
- Formulario: entrada desde 520 ms hasta 1100 ms; `inert` se retira al finalizar. Apagado inmediato del acceso de teclado, con fade visual y afterglow breve.
- Reduced motion: cancela sway/flicker/atmósfera, elimina delays y hace disponible el acceso inmediatamente. Cambiar la preferencia durante la secuencia cancela el temporizador pendiente.

## Archivos de esta pasada

- `src/features/auth/login-lamp.tsx`
- `src/features/auth/login-lamp.module.css`
- `src/features/auth/assets/lamp-realistic-atlas-v1.webp`
- `src/features/auth/login-scene.tsx`
- `src/features/auth/login-scene.module.css`
- `tests/login-scene.spec.ts`
- `tests/login-photographic.spec.ts`
- `DESIGN.md` y este informe, más evidencia local.

Dashboard, Clientes, Leads, otros módulos, globals, motion compartido, providers, Supabase, Auth, sesiones, roles, RLS, validaciones y redirects quedan fuera de las ediciones. Sus archivos se comparan por hash antes/después para acreditar el alcance.

## Validación de comandos

`npm run lint`: PASS, exit 0, sin errores ni advertencias de ESLint. `npm run build`: PASS, exit 0; compilación de producción, TypeScript y generación de 14 rutas. El aviso de Next sobre un package-lock externo al repositorio no impide compilar.

`npm run test:e2e -- tests/auth.spec.ts tests/login-scene.spec.ts tests/login-photographic.spec.ts tests/motion-system.spec.ts --reporter=list,json`: PASS, exit 0, **25/25** en 3.4 minutos: Auth 7, fotografía/glass 5, escena 6 y motion 7. Cero fallos, omitidos o flaky en la corrida final. [Balance](login-photographic-evidence/test-summary.json) e [informe completo](login-photographic-evidence/final-playwright.json).

Se valida contra el servidor de Auth simulado local, con datos de prueba explícitos, sin escribir a Supabase de producción. Se conservaron los informes anteriores para permitir rastrear las correcciones. `git diff --check`: PASS, exit 0.

El primer fallo fue una aserción que esperaba 2 px también en forced-colors, donde el indicador accesible usa 3 px. La comprobación distingue ahora ambos modos. En la prueba añadida de glass, cambiar la emulación de transparencia restablecía la preferencia de movimiento de Windows; se conservan ambas preferencias explícitamente al medir el afterglow. Ninguna corrección requirió alterar autenticación.

## Interacciones y accesibilidad

| Caso | Evidencia |
| --- | --- |
| Foto sin sesión | Recurso `_next/static/media` devuelve 200, magic WebP válido, dimensiones decodificadas y alpha; no hay SVG dentro del control de lámpara. |
| Estados alineados | Las cajas de los dos frames difieren menos de 1 px; el crossfade conserva cable, pantalla y bombilla. |
| Encendido normal | Muestreo requestAnimationFrame comprueba foto, halo y haz antes del acceso; el filamento tiene descenso breve y estabilización. |
| Acceso disponible | El formulario permanece inert y fuera del árbol accesible durante el reveal; termina alrededor de 1100 ms. |
| Apagado | Retira de inmediato el acceso de teclado; foto/luz/formulario decaen, el afterglow empieza por encima de .7 y termina en 0. El primer estado apagado tiene afterglow 0. |
| Mouse y teclado | Lámpara operable con click, Enter y Space; foco contextual pequeño y visible; sin recuadro sobre toda la imagen. |
| Valores y envío | Los campos conservan valores al apagar; correo inválido, mostrar/ocultar contraseña, credenciales incorrectas, pendiente y sesión expirada conservan su feedback. |
| Autenticación | Redirects de rutas protegidas, login válido, sesión al recargar, perfil y logout se verifican sin editar su lógica. |
| Claro/Oscuro/Sistema | Elección y persistencia existentes; Sistema sigue cambios del navegador; la lámpara conserva su estado al cambiar tema. |
| Reduced motion | Sin sway, flicker ni movimiento atmosférico; transiciones sin retraso, acceso inmediato, cambios dinámicos cancelan animaciones y temporizador. |
| Transparencia reducida | El panel pasa de rgba con blur 16 px a fondo sólido sin blur; la disponibilidad del acceso no cambia. |
| Forced colors | Colores de sistema en texto/campos/foco; indicador de lámpara de 3 px, fondo y controles visibles. |
| Responsive | 320, 390, 640, 768, 1024, 1280, 1440 y 1920 px sin overflow horizontal; targets de controles ≥44×44 px. |
| Ampliación y viewport corto | Texto al 200% sin recorte de contenedores; contraseña visible al enfocar en 390×400, con scroll natural. |
| Motion compartido | Las siete pruebas existentes de motion se ejecutan como regresión: menús, overlays, foco, drawer, rutas y avisos; no se edita su implementación. |

## Contraste de la composición final

Fórmula WCAG sRGB aplicada al color de fuente y muestras limpias del fondo de la captura final con glass. El reflejo se pinta detrás del contenido; no altera el color del texto. Se comprueban también campos, placeholder y superficies fijas de mensajes/CTA en los tests. [Medición completa](login-photographic-evidence/composite-contrast.json), [tokens claros](login-photographic-evidence/light-token-contrast.json) y [tokens oscuros](login-photographic-evidence/dark-token-contrast.json). Cero pares por debajo del umbral.

| Par | Claro | Oscuro | Umbral |
| --- | --- | --- | --- |
| Texto sobre panel compuesto | 5.39:1 | 12.16:1 | 4.5:1 |
| Texto secundario | 5.01:1 | 8.08:1 | 4.5:1 |
| Texto de error de campo | 4.87:1 | 7.51:1 | 4.5:1 |
| Límite de campo contra panel | 3.25:1 | 4.67:1 | 3:1 |
| Foco contra panel | 3.85:1 | 8.97:1 | 3:1 |
| Texto blanco del submit | 5.62:1 | 5.62:1 | 4.5:1 |
| Foco de lámpara contra su scrim | 11.60:1 | 11.60:1 | 3:1 |

## Capturas

El navegador local anuncia reducción de transparencias de forma predeterminada. Se revisaron tanto el panel sólido de esa preferencia como el glass normal emulado explícitamente. Las capturas se toman con la escena asentada y ocultan únicamente el portal de herramientas de desarrollo.

- Glass normal: [claro desktop](login-photographic-evidence/light-glass-1440.png), [oscuro desktop](login-photographic-evidence/dark-glass-1440.png), [tablet](login-photographic-evidence/dark-glass-768.png), [móvil](login-photographic-evidence/dark-glass-390.png).
- Apagada: [oscuro](login-photographic-evidence/dark-glass-off.png) y [claro](login-photographic-evidence/light-glass-off.png).
- Preferencia opaca: [claro](login-photographic-evidence/light-1440.png), [oscuro](login-photographic-evidence/dark-1440.png), [móvil](login-photographic-evidence/light-390.png).
- Resiliencia: [texto al 200%](login-photographic-evidence/light-text-200.png), [viewport corto](login-photographic-evidence/dark-short-viewport.png), [envío pendiente](login-photographic-evidence/pending.png), [error](login-photographic-evidence/error.png).

## Límites comprobables

La lámpara es un asset raster de dos estados; el haz y la atmósfera son composición de capas, no una simulación óptica 3D. El WebP pesa 150.6 KiB, se reutiliza en las capas y no añade dependencias. Las animaciones son finitas y los filtros permanecen estáticos; no se afirma una tasa de FPS medida.

Las pruebas usan Chromium/Edge local y viewports emulados. El viewport corto comprueba espacio para el campo enfocado; el teclado nativo y rendimiento GPU de un teléfono físico no se midieron. No se validaron Safari ni Firefox en esta máquina.

Asset y proceso: [WebP integrado](../src/features/auth/assets/lamp-realistic-atlas-v1.webp), [metadatos](login-photographic-evidence/asset.json), [prompt exacto](login-photographic-evidence/imagegen-prompt.txt). Modo: imagegen integrado con las referencias del usuario; optimización de formato con Sharp existente, sin reconstruir el objeto mediante SVG/CSS.

## Alcance preservado

Comparación SHA256 del agente principal: 131/131 archivos protegidos sin cambios, cero ausentes. [Resultado](login-photographic-evidence/scope-check.json) y [snapshot previo](login-photographic-evidence/protected-files-before.json). El diff acotado de formulario, servidor Auth, providers, perfil, roles, tipos, Supabase, proxy y página de login está vacío. Los cambios previos de otros módulos que aparecen en git status se conservaron; no forman parte de esta pasada.

## Delivery Gate del agente principal

Revisión realizada por el agente principal sobre el código final, capturas e interacciones de esta pasada. Cada fila corresponde a un ítem del gate obligatorio; los supuestos no aplicables se explican con el contenido real del login.

### Hard Gate

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| R-02 | PASS | El copy de la escena y fallback no contiene em dash ni emoji. |
| R-03 | PASS | Ocho anchos de 320 a 1920 px, texto al 200% y viewport corto sin overflow horizontal. |
| R-17 | PASS | El login no presenta métricas ni estadísticas. |
| R-18 | PASS | No hay testimonios, personas ni avatares inventados. |
| R-23 | PASS | El usuario pidió expresamente la lámpara fotográfica; marca y navegación existentes conservadas. |
| R-24 | PASS | El enlace Brand conserva su destino real al resumen, verificado en navegación y Auth. |
| R-25 | PASS | Fórmula WCAG sobre tokens y composición del panel; scrims estables, texto ≥4.5:1 y límites/foco ≥3:1. |
| R-26 | PASS | Lámpara, selector de tema, ojo y submit tienen comportamiento verificado con teclado y click. |
| R-27 | PASS | Apagada indica encender; formulario vacío valida; pendiente informa y bloquea envío; errores y sesión expirada visibles. |
| R-28 | PASS | No se añadió FAQ. La ayuda del acceso conserva el contacto con el administrador. |
| R-32 | PASS | Tab, Enter, Space y Escape; formulario oculto inert; foco contextual reemplaza el gran outline de lámpara. |
| R-33 | PASS | TSX/CSS/pruebas editados en fuente con apply_patch; Sharp solo optimiza formato del bitmap. |
| R-34 | PASS | Claro/Oscuro/Sistema, persistencia, forced-colors y preferencias dinámicas cubiertos. |
| R-35 | PASS | Lint, build y navegador ejecutados; controles y estados documentados en la tabla de interacciones. |
| R-36 | PASS | No se incorporaron claims de seguridad, cumplimiento, clientes ni FPS. |
| R-37 | PASS | Dirección y Design Read del brief en DESIGN.md: ENERGY 3 / RHYTHM 2 / MOTION 3. |
| R-38 | PASS | No hay contenido comercial ficticio; el asset generado es decoración solicitada, documentada como tal. |

### Purpose-Gate

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| R-01 | PASS | Gradientes y glows forman halo/haz/reflejo derivados de la referencia; propósito escrito en decisiones. |
| R-04 | PASS | Sol/luna/monitor indican apariencia; ojo muestra contraseña; no se añaden iconos de adorno. |
| R-06 | PASS | Segoe UI preserva identidad y lectura; no hay headline monoespaciado ni etiquetas nuevas con tracking amplio. |
| R-07 | PASS | No hay grid de fondo; las motas finitas representan polvo iluminado y el suelo tiene una textura leve. |
| R-08 | PASS | La flecha del submit existente indica entrada; no se distribuyen flechas por todos los controles. |
| R-09 | PASS | No hay badges de marketing ni cápsula sobre el H1. |
| R-10 | PASS | Una única superficie glass, el formulario; header e instrucción son scrims, sin backdrop-filter. |
| R-12 | PASS | Sombra principal solo separa el panel; la del CTA confirma su función. Razones de elevación documentadas. |
| R-13 | PASS | Emisión en bombilla y luz física compuesta; panel recibe reflejo, sin neón en bordes/iconos/badges. |
| R-14 | PASS | No se añadieron grillas de tarjetas; escena y acceso tienen jerarquías distintas. |
| R-19 | PASS | Secuencia revela el acceso desde la luz; sway/polvo/neblina son finitos; MOTION 3 normal, quieto con reduce. |
| R-22 | PASS | Raster industrial solicitado en lugar de blobs o ilustraciones de librería; conexión al encendido del acceso documentada. |

### Liveliness

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Diales explícitos | PASS | ENERGY 3 / RHYTHM 2 / MOTION 3 en DESIGN.md y decisiones de esta escena. |
| Coherencia con diales | PASS | Lámpara protagonista, composición asimétrica desktop y coreografía de luz por etapas. |
| Foco principal | PASS | Apagada concentra atención en lámpara/instrucción; encendida lleva al formulario y su submit. |
| Espacio estructural | PASS | Separación de lámpara y acceso, pila centrada y padding adaptable en rem. |
| Acento deliberado | PASS | Oro señala emisión; azul Nexo identifica la acción de acceso y el foco. |
| Motivo propio | PASS | La luz de la lámpara cambia estado, escena y panel al permitir entrar al espacio Nexo. |
| Design Read previo | PASS | Dirección fotográfica y diales registrados antes de integrar el atlas, derivados del brief del usuario. |

### Craftsmanship y Quality Locks

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| C-1 | PASS | Tabla de decisiones justifica foto, color, tipo, espacio, panel, foco y motion. |
| C-2 | PASS | Todas las acciones del login se operan; fallback de imagen conserva el botón funcional. |
| C-3 | PASS | Solo identidad, apariencia, encendido y formulario; no se agregan secciones de marketing. |
| C-4 | PASS | Estados, temas, anchos, teclado, forced-colors y reduced-motion pasan la validación local. |
| C-5 | PASS | Sin claims inventados; tamaños, tiempos y pruebas se vinculan a evidencia local. |
| R-05 | PASS | Escena y acceso responden al flujo solicitado; no hero+cards, bento, logos de clientes ni pricing. |
| R-11 | PASS | Radios de panel, instrucción y controles varían con su función; lámpara sin cápsula. |
| R-15 | PASS | Acciones concretas: Encender/Apagar lámpara, Mostrar/Ocultar contraseña, Iniciar sesión. |
| R-16 | PASS | Copy sin superlativos tecnológicos ni promesas de marketing añadidas. |
| R-20 | PASS | Identidad Nexo, metal industrial y tungsteno dorado asociados al reveal; referencia del usuario como estándar. |
| R-21 | PASS | Tema conservado por preferencia existente; Claro/Oscuro/Sistema implementados y probados. |
| R-29 | PASS | Azul mineral/Nexo, oro cálido y neutros del metal; error semántico reservado a validación. |
| R-30 | PASS | Se sigue la lámpara aportada y la identidad Nexo; no se clona otro producto. |
| R-31 | PASS | Cada decisión visual principal tiene una razón escrita en este informe. |

## Auditoría complementaria de las cuatro skills

| Skill / ítem | Estado | Evidencia |
| --- | --- | --- |
| antislop | PASS | Gate completo de 50 ítems anterior, revisado por el agente principal. |
| antislop-ui: paleta | PASS | Mineral azul y oro según DESIGN.md/referencia. |
| UI: acento | PASS | Luz cálida y CTA azul concentran la atención en encender y entrar. |
| UI: emoji | PASS | Copy sin emoji decorativo. |
| UI: ritmo | PASS | Dos zonas desktop; jerarquía de lámpara e ingreso; pila adaptada en tablet/móvil. |
| UI: formas por defecto | PASS | Sin bento, terminal, pricing ni franjas decorativas. |
| UI: badge sobre H1 | PASS | Marca real sobre el título, sin cápsula redundante. |
| UI: acciones | PASS | Lámpara, tema, contraseña y acceso operables. |
| UI: motion | PASS | Encendido/apagado con propósito y atmósfera finita; reduce cancela. |
| UI: dosis | PASS | Un glass, reflejo de lámpara y elevación localizada. |
| UI: luces de estado | PASS | Luz corresponde a aria-pressed y acceso disponible; sin pulsos infinitos. |
| UI: tarea de la pantalla | PASS | Encender para acceder; formulario claro y ancho útil. |
| UI: contenido real | PASS | Sin métricas ni feeds; fixtures solo en entorno de prueba. |
| UI: campos vacíos | PASS | Correo lleva placeholder descriptivo y contraseña vacía; sin datos prellenados. |
| UI: estados | PASS | Validación, envío, credenciales y sesión expirada con mensajes existentes. |
| UI: resiliencia | PASS | Anchos, temas, teclado y preferencias probados. |
| antislop-human: contraste | PASS | Fórmula WCAG sobre tokens, scrims y panel compuesto, incluido reflejo detrás del texto. |
| Human: límites | PASS | Bordes de campos y foco ≥3:1; estado de luz descrito también con texto/aria. |
| Human: foco | PASS | Indicador 2 px normal/3 px forced-colors; visible en claro y oscuro. |
| Human: teclado | PASS | Tab/Enter/Space, menú con Escape y sin acceso a formulario oculto. |
| Human: estados | PASS | Vacío/pending/error perceptibles; aria-busy, status y alert preservados. |
| Human: ampliación/teclado | PASS | Texto 200% y campo enfocado en 390×400 sin recorte; prueba de viewport reducido, no teclado físico. |
| antislop-layoutmobile: reflow | PASS | Una columna en móvil/tablet, dos en desktop. |
| Mobile: intermedios | PASS | Estilo específico 640–1023 px con lámpara de 17 rem y panel limitado. |
| Mobile: escala | PASS | Lámpara de 12 rem, controles de 44 px, fuentes y espaciado adaptados. |
| Mobile: colapso | PASS | Grid minmax(0,1fr) y formulario oculto colapsable en pila. |
| Mobile: overflow | PASS | scrollWidth ≤ innerWidth en los ocho anchos y al ampliar texto. |
| Mobile: targets | PASS | Controles ≥44×44 px, separados por campos y gaps del layout. |
| Mobile: touch | PASS | Click/tap activa todos los controles; hover es solo feedback adicional. |
| Mobile: navegación | PASS | El login solo requiere el menú accesible de apariencia; sin fila desktop comprimida. |
| Mobile: barras y safe area | PASS | Herramientas superiores no son sticky; padding inferior incluye env(safe-area-inset-bottom). |
| Mobile: comprobación | PASS | Capturas 390/768/1440 y assertions 320/390/640/768/1024/1280/1440/1920. |
