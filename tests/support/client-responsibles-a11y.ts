import { expect, type Locator, type Page } from "@playwright/test";

export async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(layout.content, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport);
}

export async function expectVisibleFocus(control: Locator) {
  await expect(control).toBeFocused();
  const indicator = await control.evaluate((element) => {
    const css = getComputedStyle(element);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2], data[3] / 255];
    };
    const blend = (front: number[], back: number[]) => [0, 1, 2].map((i) => front[i] * front[3] + back[i] * (1 - front[3])).concat(1);
    const background = (target: Element | null): number[] => {
      if (!target) return [255, 255, 255, 1];
      const color = rgba(getComputedStyle(target).backgroundColor);
      return color[3] === 1 ? color : blend(color, background(target.parentElement));
    };
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const bg = background(element.parentElement);
    const a = luminance(bg); const b = luminance(blend(rgba(css.outlineColor), bg));
    return { outline: css.outlineStyle, width: parseFloat(css.outlineWidth), contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
  });
  expect(indicator.outline, JSON.stringify(indicator)).not.toBe("none");
  expect(indicator.width).toBeGreaterThanOrEqual(2);
  expect(indicator.contrast).toBeGreaterThanOrEqual(3);
}

export async function expectTouchTargets(scope: Locator) {
  const controls = await scope.locator('button:visible,input:not([type="hidden"]):visible,select:visible,textarea:visible,[role="combobox"]:visible,[role="option"]:visible').all();
  for (const control of controls) {
    const bounds = await control.boundingBox();
    expect(bounds, await control.getAttribute("aria-label") ?? await control.textContent() ?? "control").not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
}

export async function measureResponsibleTextContrast(scope: Locator) {
  return scope.locator("*").evaluateAll((elements) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const channels = context.getImageData(0, 0, 1, 1).data;
      return [channels[0], channels[1], channels[2], channels[3] / 255];
    };
    const blend = (front: number[], back: number[]) => [0, 1, 2].map((i) => front[i] * front[3] + back[i] * (1 - front[3])).concat(1);
    const background = (element: Element | null): number[] => {
      if (!element) return [255, 255, 255, 1];
      const color = rgba(getComputedStyle(element).backgroundColor);
      return color[3] === 1 ? color : blend(color, background(element.parentElement));
    };
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    return elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility === "hidden" || style.display === "none" || element.closest('nextjs-portal,[aria-hidden="true"],[disabled]')) return [];
      const directText = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent?.trim()).join(" ").trim();
      const inputText = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.value : "";
      const placeholder = (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && !inputText ? element.placeholder : "";
      const text = directText || inputText || placeholder;
      if (!text) return [];
      const foreground = placeholder ? getComputedStyle(element, "::placeholder").color : style.color;
      const bg = background(element);
      const fg = blend(rgba(foreground), bg);
      const a = luminance(bg); const b = luminance(fg);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const size = parseFloat(style.fontSize);
      const minimum = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
      return [{ text, ratio, minimum, foreground, background: bg.join(",") }];
    });
  });
}

export async function expectResponsibleTextContrast(scope: Locator) {
  const measurements = await measureResponsibleTextContrast(scope);
  expect(measurements.length).toBeGreaterThan(0);
  const failures = measurements.filter((entry) => entry.ratio < entry.minimum);
  expect(failures, JSON.stringify(failures)).toEqual([]);
  return measurements;
}

export async function expectResponsibleControlContrast(scope: Locator) {
  const measurements = await scope.locator('input:not([type="hidden"]):visible,select:visible,textarea:visible').evaluateAll((elements) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2], data[3] / 255];
    };
    const blend = (front: number[], back: number[]) => [0, 1, 2].map((i) => front[i] * front[3] + back[i] * (1 - front[3])).concat(1);
    const background = (target: Element | null): number[] => {
      if (!target) return [255, 255, 255, 1];
      const color = rgba(getComputedStyle(target).backgroundColor);
      return color[3] === 1 ? color : blend(color, background(target.parentElement));
    };
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const ratio = (front: number[], back: number[]) => {
      const a = luminance(front); const b = luminance(back);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    return elements.filter((element) => !element.closest("[disabled]")).map((element) => {
      const color = rgba(getComputedStyle(element).borderTopColor);
      const inside = background(element); const outside = background(element.parentElement);
      return { name: element.getAttribute("name"), inside: ratio(blend(color, inside), inside), outside: ratio(blend(color, outside), outside) };
    });
  });
  expect(measurements.length).toBeGreaterThan(0);
  expect(measurements.filter((entry) => entry.inside < 3 || entry.outside < 3), JSON.stringify(measurements)).toEqual([]);
  return measurements;
}
