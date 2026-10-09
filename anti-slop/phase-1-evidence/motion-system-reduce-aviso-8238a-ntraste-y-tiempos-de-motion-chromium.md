# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: motion-system.spec.ts >> reduce: aviso real conserva tema, contraste y tiempos de motion
- Location: tests\motion-system.spec.ts:178:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 22

- Array []
+ Array [
+   Object {
+     "animationDelay": "0s",
+     "animationDuration": "0s",
+     "className": null,
+     "element": "DIV",
+     "pseudo": null,
+     "slot": null,
+     "transitionDelay": "0s, 0s, 0s, 0s",
+     "transitionDuration": "0.15s, 0.25s, 0.25s, 0.15s",
+   },
+   Object {
+     "animationDelay": "0s",
+     "animationDuration": "0s",
+     "className": null,
+     "element": "BUTTON",
+     "pseudo": null,
+     "slot": null,
+     "transitionDelay": "0s",
+     "transitionDuration": "0.25s",
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - generic [ref=f2e2]:
    - link "Saltar al contenido" [ref=f2e3] [cursor=pointer]:
      - /url: "#contenido"
    - complementary [ref=f2e4]:
      - link "Nexo CRM, ir al resumen" [ref=f2e6] [cursor=pointer]:
        - /url: /
        - generic [ref=f2e10]: nexoCRM
      - generic [ref=f2e16]:
        - paragraph [ref=f2e17]: Mi empresa
        - paragraph [ref=f2e18]: Espacio de trabajo
      - navigation "Navegación principal" [ref=f2e19]:
        - link "Resumen" [ref=f2e21] [cursor=pointer]:
          - /url: /
        - generic [ref=f2e27]:
          - paragraph [ref=f2e28]: Gestión comercial
          - link "Clientes" [ref=f2e29] [cursor=pointer]:
            - /url: /clientes
        - link "Leads" [ref=f2e35] [cursor=pointer]:
          - /url: /leads
        - link "Oportunidades" [ref=f2e42] [cursor=pointer]:
          - /url: /oportunidades
        - link "Ventas" [ref=f2e48] [cursor=pointer]:
          - /url: /ventas
        - link "Tareas" [ref=f2e53] [cursor=pointer]:
          - /url: /tareas
        - generic [ref=f2e57]:
          - paragraph [ref=f2e58]: Herramientas
          - button "Calendario Pronto" [ref=f2e59] [cursor=pointer]:
            - text: Calendario
            - generic [ref=f2e62]: Pronto
        - button "Reportes Pronto" [ref=f2e64] [cursor=pointer]:
          - text: Reportes
          - generic [ref=f2e67]: Pronto
      - generic [ref=f2e68]:
        - link "Configuración" [ref=f2e69] [cursor=pointer]:
          - /url: /configuracion
        - link "Usuarios" [ref=f2e73] [cursor=pointer]:
          - /url: /configuracion/usuarios
        - button "Ayuda" [ref=f2e78] [cursor=pointer]
      - button "Menú de Carlos Motion Prueba" [ref=f2e82] [cursor=pointer]:
        - generic [ref=f2e83]: CM
        - generic [ref=f2e84]:
          - generic [ref=f2e85]: Carlos Motion Prueba
          - generic [ref=f2e86]: Administrador
    - generic [ref=f2e90]:
      - banner [ref=f2e91]:
        - generic [ref=f2e92]:
          - generic [ref=f2e93]:
            - generic [ref=f2e94]: Mi empresa
            - generic [ref=f2e97]: Mi perfil
          - search "Búsqueda de clientes" [ref=f2e98]:
            - textbox "Buscar en Nexo" [ref=f2e99]:
              - /placeholder: Buscar clientes...
            - button "Ejecutar búsqueda" [ref=f2e100] [cursor=pointer]
          - generic [ref=f2e101]:
            - 'button "Cambiar tema: Sistema" [ref=f2e102] [cursor=pointer]'
            - button "Notificaciones" [ref=f2e103] [cursor=pointer]
            - button "Menú de Carlos Motion Prueba" [ref=f2e106] [cursor=pointer]:
              - generic [ref=f2e107]: CM
      - main [ref=f2e108]:
        - generic [ref=f2e110]:
          - generic [ref=f2e111]:
            - heading "Mi perfil" [level=1] [ref=f2e112]
            - paragraph [ref=f2e113]: Tu información personal y acceso a Nexo CRM.
          - generic [ref=f2e114]:
            - generic [ref=f2e115]:
              - generic [ref=f2e116]: CM
              - generic [ref=f2e117]:
                - heading "Carlos Motion Prueba" [level=2] [ref=f2e118]
                - paragraph [ref=f2e119]: Administrador
            - generic [ref=f2e120]:
              - generic [ref=f2e121]:
                - generic [ref=f2e122]:
                  - generic [ref=f2e123]: Nombres
                  - textbox "Nombres" [ref=f2e124]: Carlos Motion
                - generic [ref=f2e125]:
                  - generic [ref=f2e126]: Apellidos
                  - textbox "Apellidos" [ref=f2e127]: Prueba
              - generic [ref=f2e128]:
                - generic [ref=f2e129]:
                  - term [ref=f2e130]: Correo electrónico
                  - definition [ref=f2e131]: admin@example.test
                - generic [ref=f2e132]:
                  - generic [ref=f2e133]:
                    - term [ref=f2e134]: Rol
                    - definition [ref=f2e135]: Administrador
                  - generic [ref=f2e136]:
                    - term [ref=f2e137]: Estado
                    - definition [ref=f2e138]: Activo
              - paragraph [ref=f2e139]: Puedes editar tus nombres y apellidos. Para cambiar el correo, el rol o el estado de tu cuenta, contacta al administrador.
              - button "Guardar cambios" [ref=f2e140] [cursor=pointer]
        - generic [ref=f2e141]: Nexo CRM · Hecho para conectar
  - region "Notificaciones alt+T":
    - list:
      - listitem [ref=f2e142]:
        - button "Close toast" [ref=f2e143] [cursor=pointer]
        - generic [ref=f2e151]: Perfil actualizado
  - button "Open Next.js Dev Tools" [ref=f2e158] [cursor=pointer]
  - alert [ref=f2e162]
```

# Test source

```ts
  94  |       await expect(page.locator("html")).toHaveClass(new RegExp(className));
  95  |       const notifications = page.getByRole("button", { name: "Notificaciones", exact: true });
  96  |       await notifications.focus();
  97  |       await page.keyboard.press("Enter");
  98  |       const dialog = page.getByRole("dialog", { name: "Notificaciones" });
  99  |       await expect(dialog).toBeVisible();
  100 |       await insideViewport(page, dialog);
  101 |       await expect.poll(async () => {
  102 |         const bounds = await dialog.boundingBox();
  103 |         return bounds ? Math.abs(bounds.x + bounds.width / 2 - page.viewportSize()!.width / 2) : Infinity;
  104 |       }).toBeLessThan(2);
  105 |       for (let step = 0; step < 4; step += 1) {
  106 |         await page.keyboard.press("Tab");
  107 |         expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  108 |       }
  109 |       await page.screenshot({ path: testInfo.outputPath(`dialog-${className}-${reducedMotion}.png`), animations: "disabled" });
  110 |       await page.keyboard.press("Escape");
  111 |       await expect(dialog).toBeHidden();
  112 |       await expect(notifications).toBeFocused();
  113 |       expect(await notifications.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  114 |       await page.setViewportSize({ width: 390, height: 400 });
  115 |       await page.getByRole("button", { name: "Nuevo cliente", exact: true }).press("Enter");
  116 |       const form = page.getByRole("dialog", { name: "Nuevo cliente" });
  117 |       await expect(form).toBeVisible();
  118 |       await insideViewport(page, form);
  119 |       await page.getByLabel("Notas", { exact: true }).focus();
  120 |       await expect(page.getByLabel("Notas", { exact: true })).toBeInViewport({ ratio: 1 });
  121 |       await page.keyboard.press("Escape");
  122 |       await expect(form).toBeHidden();
  123 |       await expect(page.getByRole("button", { name: "Nuevo cliente", exact: true })).toBeFocused();
  124 |     }
  125 |     expect(errors).toEqual([]);
  126 |   });
  127 | }
  128 | 
  129 | test("la navegación móvil sigue accesible al cambiar de ancho y con movimiento reducido", async ({ page }, testInfo) => {
  130 |   await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  131 |   await emptyWorkspace(page);
  132 |   await login(page);
  133 |   for (const width of [320, 640, 768]) {
  134 |     await page.setViewportSize({ width, height: 900 });
  135 |     const trigger = page.getByRole("button", { name: "Abrir navegación" });
  136 |     await trigger.focus();
  137 |     await page.keyboard.press("Enter");
  138 |     const drawer = page.getByRole("dialog", { name: "Navegación de Nexo CRM" });
  139 |     await expect(drawer).toBeVisible();
  140 |     await insideViewport(page, drawer);
  141 |     const clients = drawer.getByRole("link", { name: "Clientes", exact: true });
  142 |     await clients.focus();
  143 |     await page.keyboard.press("Enter");
  144 |     await expect(page).toHaveURL(/\/clientes$/);
  145 |     await expect(drawer).toBeHidden();
  146 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  147 |     await trigger.press("Enter");
  148 |     await expect(drawer).toBeVisible();
  149 |     await page.keyboard.press("Escape");
  150 |     await expect(drawer).toBeHidden();
  151 |     await expect(trigger).toBeFocused();
  152 |     await page.screenshot({ path: testInfo.outputPath(`mobile-shell-${width}.png`), fullPage: true, animations: "disabled" });
  153 |   }
  154 |   await page.setViewportSize({ width: 1280, height: 900 });
  155 |   await expect(page.getByRole("button", { name: "Abrir navegación" })).toBeHidden();
  156 |   const clientLink = page.locator("aside").getByRole("link", { name: "Clientes", exact: true });
  157 |   await expect(clientLink).toHaveAttribute("aria-current", "page");
  158 |   await clientLink.focus();
  159 |   expect(await clientLink.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  160 | });
  161 | 
  162 | test("la entrada de página termina y se cancela al activar movimiento reducido", async ({ page }) => {
  163 |   await page.emulateMedia({ reducedMotion: "no-preference" });
  164 |   await emptyWorkspace(page);
  165 |   await login(page);
  166 |   const motion = page.locator('[data-motion="page"]');
  167 |   await expect.poll(() => motion.evaluate((element) => element.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
  168 |   await page.addStyleTag({ content: ":root { --motion-enter: 4000ms; }" });
  169 |   await page.locator("aside").getByRole("link", { name: "Clientes", exact: true }).click();
  170 |   await expect.poll(() => motion.evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(true);
  171 |   await page.emulateMedia({ reducedMotion: "reduce" });
  172 |   await expect.poll(() => motion.evaluate((element) => element.getAnimations().length)).toBe(0);
  173 |   expect(await motion.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  174 |   await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
  175 | });
  176 | 
  177 | for (const reducedMotion of ["no-preference", "reduce"] as const) {
  178 |   test(`${reducedMotion}: aviso real conserva tema, contraste y tiempos de motion`, async ({ page }) => {
  179 |     await page.emulateMedia({ reducedMotion, colorScheme: "light" });
  180 |     await emptyWorkspace(page);
  181 |     await login(page);
  182 |     await page.goto("/perfil");
  183 |     await page.getByLabel("Nombres", { exact: true }).fill("Carlos Motion");
  184 |     await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  185 |     const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Perfil actualizado" });
  186 |     await expect(toast).toBeVisible();
  187 |     await toast.focus();
  188 |     expect(await toast.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  189 |     const timings = await toast.evaluate((element) => {
  190 |       const style = getComputedStyle(element);
  191 |       return { duration: style.transitionDuration.split(",").map(parseFloat), radius: style.borderRadius, color: style.color };
  192 |     });
  193 |     expect(timings.radius).toBe("14px");
> 194 |     expect(timings.duration.every((duration) => duration <= (reducedMotion === "reduce" ? .001 : .32))).toBe(true);
      |                                                                                 ^ Error: expect(received).toEqual(expected) // deep equality
  195 |     if (reducedMotion === "no-preference") expect(timings.duration.some((duration) => duration > .1)).toBe(true);
  196 |     if (reducedMotion === "reduce") expect(await reducedMotionViolations(page)).toEqual([]);
  197 |     await page.getByRole("button", { name: /^Cambiar tema/ }).click();
  198 |     await page.getByRole("menuitemradio", { name: "Oscuro", exact: true }).click();
  199 |     await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", "dark");
  200 |     await expect(toast).toBeVisible();
  201 |     expect(await toast.evaluate((element) => getComputedStyle(element).color)).not.toBe(timings.color);
  202 |   });
  203 | }
  204 | 
```