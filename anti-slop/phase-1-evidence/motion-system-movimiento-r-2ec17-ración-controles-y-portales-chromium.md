# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: motion-system.spec.ts >> movimiento reducido elimina esperas en login, decoración, controles y portales
- Location: tests\motion-system.spec.ts:51:5

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
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [aria-hidden] [ref=e3]: NexoCRM
    - generic [ref=e4]:
      - generic [ref=e5]: Apariencia
      - 'button "Cambiar tema: Sistema" [ref=e6] [cursor=pointer]'
    - generic [ref=e8]:
      - button "Encender lámpara" [ref=e9] [cursor=pointer]
      - paragraph [ref=e85]:
        - generic [ref=e86]: Enciende la luzpara continuar.
        - generic [ref=e87]: Pulsa la lámpara
  - region "Notificaciones alt+T"
  - button "Open Next.js Dev Tools" [ref=e93] [cursor=pointer]
  - alert [ref=e97]
```

# Test source

```ts
  1   | import { expect, test, type Locator, type Page } from "@playwright/test";
  2   | import { enableLogin, login } from "./support/login";
  3   | 
  4   | async function emptyWorkspace(page: Page) {
  5   |   await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [] }));
  6   |   await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => route.fulfill({ json: [] }));
  7   | }
  8   | 
  9   | async function reducedMotionViolations(page: Page) {
  10  |   return page.locator("body *").evaluateAll((elements) => {
  11  |     const seconds = (value: string) => value.split(",").map((part) => parseFloat(part) || 0);
  12  |     return elements.flatMap((element) => {
  13  |       if (element.closest("nextjs-portal")) return [];
  14  |       const bounds = element.getBoundingClientRect();
  15  |       if (bounds.width === 0 || bounds.height === 0) return [];
  16  |       return [null, "::before", "::after"].flatMap((pseudo) => {
  17  |         const style = getComputedStyle(element, pseudo);
  18  |         if (style.display === "none" || style.visibility === "hidden") return [];
  19  |         if (pseudo && ["none", "normal"].includes(style.content)) return [];
  20  |         const timings = {
  21  |           animationDuration: style.animationDuration,
  22  |           animationDelay: style.animationDelay,
  23  |           transitionDuration: style.transitionDuration,
  24  |           transitionDelay: style.transitionDelay,
  25  |         };
  26  |         const delayed = seconds(timings.animationDelay).some((value) => value !== 0)
  27  |           || seconds(timings.transitionDelay).some((value) => value !== 0);
  28  |         const animated = seconds(timings.animationDuration).some((value) => value > .001)
  29  |           || seconds(timings.transitionDuration).some((value) => value > .001);
  30  |         return delayed || animated ? [{ element: element.tagName, slot: element.getAttribute("data-slot"), className: element.getAttribute("class"), pseudo, ...timings }] : [];
  31  |       });
  32  |     });
  33  |   });
  34  | }
  35  | 
  36  | async function insideViewport(page: Page, element: Locator) {
  37  |   await expect(element).toBeInViewport({ ratio: 1 });
  38  |   const bounds = await element.boundingBox();
  39  |   const viewport = page.viewportSize()!;
  40  |   expect(bounds).not.toBeNull();
  41  |   expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  42  |   expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  43  |   expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  44  |   expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  45  | }
  46  | 
  47  | test.beforeEach(async ({ request }) => {
  48  |   await request.post("http://127.0.0.1:54321/__test/reset");
  49  | });
  50  | 
  51  | test("movimiento reducido elimina esperas en login, decoración, controles y portales", async ({ page }, testInfo) => {
  52  |   await page.emulateMedia({ reducedMotion: "reduce" });
  53  |   await emptyWorkspace(page);
  54  |   await page.goto("/login");
> 55  |   expect(await reducedMotionViolations(page)).toEqual([]);
      |                                               ^ Error: expect(received).toEqual(expected) // deep equality
  56  |   await enableLogin(page);
  57  |   expect(await reducedMotionViolations(page)).toEqual([]);
  58  |   await login(page);
  59  |   await page.getByRole("button", { name: /^Cambiar tema/ }).press("Enter");
  60  |   await expect(page.getByRole("menu")).toBeVisible();
  61  |   expect(await reducedMotionViolations(page)).toEqual([]);
  62  |   await page.keyboard.press("Escape");
  63  |   await page.getByRole("button", { name: "Notificaciones", exact: true }).press("Enter");
  64  |   await expect(page.getByRole("dialog", { name: "Notificaciones" })).toBeVisible();
  65  |   const violations = await reducedMotionViolations(page);
  66  |   await testInfo.attach("reduced-motion.json", { body: JSON.stringify(violations, null, 2), contentType: "application/json" });
  67  |   expect(violations).toEqual([]);
  68  |   await page.keyboard.press("Escape");
  69  |   await page.setViewportSize({ width: 390, height: 844 });
  70  |   await page.getByRole("button", { name: "Abrir navegación" }).press("Enter");
  71  |   await expect(page.getByRole("dialog", { name: "Navegación de Nexo CRM" })).toBeVisible();
  72  |   expect(await reducedMotionViolations(page)).toEqual([]);
  73  | });
  74  | 
  75  | for (const reducedMotion of ["no-preference", "reduce"] as const) {
  76  |   test(`${reducedMotion}: dropdown y diálogo conservan posición, foco y temas al animar`, async ({ page }, testInfo) => {
  77  |     await page.emulateMedia({ reducedMotion });
  78  |     await emptyWorkspace(page);
  79  |     await login(page);
  80  |     const errors: string[] = [];
  81  |     page.on("pageerror", (error) => errors.push(error.message));
  82  |     for (const [theme, className] of [["Oscuro", "dark"], ["Claro", "light"]]) {
  83  |       await page.setViewportSize({ width: 1280, height: 900 });
  84  |       const switcher = page.getByRole("button", { name: /^Cambiar tema/ });
  85  |       await switcher.focus();
  86  |       await page.keyboard.press("Enter");
  87  |       const menu = page.getByRole("menu");
  88  |       await expect(menu).toBeVisible();
  89  |       await insideViewport(page, menu);
  90  |       await page.getByRole("menuitemradio", { name: theme, exact: true }).focus();
  91  |       await page.keyboard.press("Enter");
  92  |       await expect(menu).toBeHidden();
  93  |       await expect(switcher).toBeFocused();
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
```