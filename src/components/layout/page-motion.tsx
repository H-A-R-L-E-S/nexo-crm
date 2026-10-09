"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export function PageMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || preference.matches) return;
    const style = getComputedStyle(element);
    const animation = element.animate([
      { opacity: .5, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], {
      duration: parseFloat(style.getPropertyValue("--motion-enter")) || 320,
      easing: style.getPropertyValue("--ease-enter").trim() || "ease-out",
    });
    const onPreferenceChange = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      animation.cancel();
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, [pathname]);

  return <div ref={container} className="page-motion" data-motion="page">{children}</div>;
}
