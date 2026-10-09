import { expect, test, type Page } from "@playwright/test";
import { enableLogin } from "./support/login";

async function darkScene(page: Page) {
  await page.addInitScript(() => localStorage.setItem("nexo-theme", "dark"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Encender lámpara", exact: true })).toBeEnabled();
}

async function lightingFrames(page: Page, turnOn: boolean) {
  return page.evaluate(async (enabled) => {
    const stage = document.querySelector<HTMLElement>("#login-access")!;
    const scene = document.querySelector<HTMLElement>("main[data-lit]")!;
    const button = scene.querySelector<HTMLButtonElement>("button[aria-controls='login-access']")!;
    const layers = {
      photo: scene.querySelector<HTMLElement>("[data-lamp-image='on']")!,
      halo: scene.querySelector<HTMLElement>("[data-light-layer='halo']")!,
      beam: scene.querySelector<HTMLElement>("[data-light-layer='beam']")!,
      dust: scene.querySelector<HTMLElement>("[data-light-layer='dust']")!,
      form: stage,
    };
    const frames: Array<{ time: number; photo: number; halo: number; beam: number; dust: number; form: number; inert: boolean; ready: boolean }> = [];
    const ignition: Array<{ duration: number; opacity: number[] }> = [];
    const started = performance.now();
    button.click();
    return new Promise<{ frames: typeof frames; ignition: typeof ignition }>((resolve) => {
      const sample = () => {
        if (enabled && ignition.length === 0) {
          const filament = scene.querySelector<HTMLElement>("[data-lamp-part='filament']")!;
          ignition.push(...filament.getAnimations().filter((animation) => animation.effect instanceof KeyframeEffect).map((animation) => ({
            duration: Number(animation.effect!.getComputedTiming().duration),
            opacity: (animation.effect as KeyframeEffect).getKeyframes().map((frame) => Number(frame.opacity)).filter(Number.isFinite),
          })));
        }
        const values = Object.fromEntries(Object.entries(layers).map(([name, element]) => [name, Number(getComputedStyle(element).opacity)]));
        const frame = {
          time: performance.now() - started,
          photo: values.photo,
          halo: values.halo,
          beam: values.beam,
          dust: values.dust,
          form: values.form,
          inert: stage.inert,
          ready: scene.dataset.accessReady === "true",
        };
        frames.push(frame);
        const finished = enabled
          ? frame.form >= .999 && frame.photo >= .999 && frame.ready && !frame.inert
          : [frame.form, frame.photo, frame.halo, frame.beam, frame.dust].every((opacity) => opacity <= .001) && frame.inert && !frame.ready;
        if (finished || frame.time > 1800) resolve({ frames, ignition });
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  }, turnOn);
}

async function sceneAnimations(page: Page) {
  return page.locator("main").evaluate((scene) => scene.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").map((animation) => ({
    state: animation.playState,
    duration: animation.effect?.getComputedTiming().duration,
    iterations: animation.effect?.getComputedTiming().iterations,
  })));
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

test("la lámpara fotográfica carga sin sesión y sus dos estados se alinean", async ({ page, request }, testInfo) => {
  await darkScene(page);
  const off = page.locator("[data-lamp-image='off']");
  const on = page.locator("[data-lamp-image='on']");
  await expect(off.locator("img")).toHaveCount(1);
  await expect(on.locator("img")).toHaveCount(1);
  await expect(page.locator("button[aria-controls='login-access'] svg")).toHaveCount(0);
  const raster = await page.locator("[data-lamp-image] img").evaluateAll(async (images) => Promise.all(images.map(async (element) => {
    const image = element as HTMLImageElement;
    await image.decode();
    return { src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight, alt: image.alt };
  })));
  expect(raster).toHaveLength(2);
  for (const image of raster) {
    expect(image.src).toMatch(/\/_next\/static\/media\/[^?]+\.(webp|png)$/);
    expect(image.width).toBeGreaterThanOrEqual(640);
    expect(image.height).toBeGreaterThanOrEqual(400);
    expect(image.alt).toBe("");
    const response = await request.get(image.src, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\/(webp|png)/);
    const bytes = await response.body();
    const isWebP = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(isWebP || isPng).toBe(true);
  }
  for (const lit of [false, true]) {
    if (lit) await enableLogin(page);
    const offBounds = await off.boundingBox();
    const onBounds = await on.boundingBox();
    expect(offBounds).not.toBeNull();
    expect(onBounds).not.toBeNull();
    for (const key of ["x", "y", "width", "height"] as const) expect(Math.abs(offBounds![key] - onBounds![key])).toBeLessThan(1);
  }
  await expect(on).toHaveCSS("opacity", "1");
  await testInfo.attach("raster-assets.json", { body: JSON.stringify(raster, null, 2), contentType: "application/json" });
});

test("el encendido revela luz antes del acceso y el apagado conserva una caída gradual", async ({ page }, testInfo) => {
  await darkScene(page);
  await expect(page.locator("#login-access")).toHaveAttribute("inert", "");
  const { frames: on, ignition } = await lightingFrames(page, true);
  expect(ignition.some((animation) => animation.duration >= 100 && animation.duration <= 250
    && animation.opacity.some((value, index) => index > 0 && value < animation.opacity[index - 1]))).toBe(true);
  const first = (key: "photo" | "halo" | "beam" | "dust" | "form") => on.find((frame) => frame[key] > .01)?.time ?? Infinity;
  expect(first("photo")).toBeLessThan(first("form"));
  expect(first("halo")).toBeLessThan(first("form"));
  expect(first("beam")).toBeLessThan(first("form"));
  expect(first("dust")).toBeLessThan(Infinity);
  expect(on.filter((frame) => frame.form < .99).every((frame) => frame.inert && !frame.ready)).toBe(true);
  const settled = on.at(-1)!;
  expect(settled.form).toBeGreaterThanOrEqual(.999);
  expect(settled.photo).toBeGreaterThanOrEqual(.999);
  expect(settled.ready).toBe(true);
  expect(settled.inert).toBe(false);
  expect(settled.time).toBeGreaterThanOrEqual(700);
  expect(settled.time).toBeLessThanOrEqual(1320);
  await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toBeVisible();
  const { frames: off } = await lightingFrames(page, false);
  expect(off.some((frame) => frame.photo > .05 && frame.photo < .95)).toBe(true);
  expect(off.some((frame) => frame.form > .05 && frame.form < .95)).toBe(true);
  expect(off.every((frame) => frame.inert && !frame.ready)).toBe(true);
  expect(off.at(-1)!.photo).toBeLessThanOrEqual(.001);
  expect(off.at(-1)!.form).toBeLessThanOrEqual(.001);
  await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toHaveCount(0);
  await testInfo.attach("lighting-frames.json", { body: JSON.stringify({ ignition, on, off }, null, 2), contentType: "application/json" });
});

test("el foco contextual funciona con teclado y no dibuja una caja sobre la escena", async ({ page }) => {
  await darkScene(page);
  const lamp = page.getByRole("button", { name: /^(Encender|Apagar) lámpara$/ });
  const cue = lamp.locator("[data-lamp-focus]");
  await expect(cue).toHaveCSS("opacity", "0");
  await lamp.click();
  await expect(cue).toHaveCSS("opacity", "0");
  await expect(lamp).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Tab");
  await lamp.focus();
  await expect(cue).toHaveCSS("opacity", "1");
  await expect(cue).toHaveCSS("outline-width", "2px");
  await expect(lamp).toHaveCSS("outline-style", "none");
  expect(await lamp.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await page.keyboard.press("Space");
  await expect(lamp).toHaveAttribute("aria-pressed", "false");
  await expect(lamp).toBeFocused();
  await expect(cue).toHaveCSS("opacity", "1");
});

test("reduced-motion dinámico cancela atmósfera y permite invertir el encendido sin foco oculto", async ({ page }) => {
  await darkScene(page);
  await enableLogin(page);
  const ambientMotion = await sceneAnimations(page);
  expect(ambientMotion.length).toBeGreaterThan(0);
  expect(ambientMotion.every((animation) => Number.isFinite(animation.iterations))).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => sceneAnimations(page)).toEqual([]);
  const lamp = page.getByRole("button", { name: /^(Encender|Apagar) lámpara$/ });
  await lamp.press("Space");
  await expect(page.locator("#login-access")).toHaveAttribute("inert", "");
  await lamp.press("Space");
  await expect(page.locator("main")).toHaveAttribute("data-access-ready", "true");
  await expect(page.locator("#login-access")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#login-access")).toHaveCSS("opacity", "1");
  await expect.poll(() => sceneAnimations(page)).toEqual([]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await lamp.press("Space");
  await lamp.press("Space");
  await expect(page.locator("main")).toHaveAttribute("data-access-ready", "false");
  await expect(page.locator("#login-access")).toHaveAttribute("inert", "");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main")).toHaveAttribute("data-access-ready", "true");
  await expect(page.locator("#login-access")).not.toHaveAttribute("inert", "");
  await expect.poll(() => sceneAnimations(page)).toEqual([]);
  await expect(lamp).toBeFocused();
});

test("glass en ambos temas y alternativa opaca al reducir transparencias", async ({ page }, testInfo) => {
  const media = await page.context().newCDPSession(page);
  const observations = [];
  await page.goto("/login");
  for (const theme of ["light", "dark"]) {
    await media.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
      { name: "prefers-reduced-motion", value: "no-preference" },
    ] });
    await page.evaluate((value) => localStorage.setItem("nexo-theme", value), theme);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    const afterglow = page.locator("[data-lamp-part='afterglow']");
    await expect(afterglow).toHaveCSS("opacity", "0");
    await page.screenshot({ path: testInfo.outputPath(`${theme}-glass-off.png`), fullPage: true, style: "nextjs-portal { display: none !important; }" });
    await enableLogin(page);
    const panel = page.locator("#login-access > div");
    await expect(panel).toHaveCSS("backdrop-filter", "blur(16px)");
    const transparent = await panel.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(transparent).toMatch(theme === "light" ? /0\.78\)$/ : /0\.91\)$/);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.screenshot({ path: testInfo.outputPath(`${theme}-glass-${width}.png`), fullPage: true, animations: "disabled", style: "nextjs-portal { display: none !important; }" });
    }
    await media.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-reduced-transparency", value: "reduce" },
      { name: "prefers-reduced-motion", value: "no-preference" },
    ] });
    await expect(panel).toHaveCSS("backdrop-filter", "none");
    const opaque = await panel.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(opaque).toMatch(/^rgb\(/);
    await expect(page.locator("#login-access")).not.toHaveAttribute("inert", "");
    observations.push({ theme, transparent, opaque });
    await page.getByRole("button", { name: "Apagar lámpara", exact: true }).click();
    expect(Number(await afterglow.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(.7);
    await expect(afterglow).toHaveCSS("opacity", "0");
  }
  await testInfo.attach("glass.json", { body: JSON.stringify(observations, null, 2), contentType: "application/json" });
});
