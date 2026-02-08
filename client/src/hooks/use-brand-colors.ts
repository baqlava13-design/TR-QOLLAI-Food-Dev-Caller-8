import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const cleaned = hex.trim();
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function isValidHex(hex: string): boolean {
  return /^#[a-f\d]{6}$/i.test(hex.trim());
}

function hslToCssValue(hsl: { h: number; s: number; l: number }): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function generateDarkVariant(hsl: { h: number; s: number; l: number }): { h: number; s: number; l: number } {
  return {
    h: hsl.h,
    s: Math.min(100, hsl.s + 5),
    l: Math.min(100, hsl.l + 4),
  };
}

function computeForeground(hsl: { h: number; s: number; l: number }): string {
  return hsl.l > 55 ? "0 0% 10%" : "0 0% 100%";
}

function applyColors(primaryHex: string | undefined, accentHex: string | undefined) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  if (primaryHex && isValidHex(primaryHex)) {
    const hsl = hexToHSL(primaryHex);
    if (hsl) {
      const baseHsl = isDark ? generateDarkVariant(hsl) : hsl;
      const cssVal = hslToCssValue(baseHsl);
      const fgVal = computeForeground(baseHsl);

      root.style.setProperty("--primary", cssVal);
      root.style.setProperty("--primary-foreground", fgVal);
      root.style.setProperty("--ring", cssVal);
      root.style.setProperty("--sidebar-primary", cssVal);
      root.style.setProperty("--sidebar-primary-foreground", fgVal);
      root.style.setProperty("--sidebar-ring", cssVal);
      root.style.setProperty("--chart-1", cssVal);
    }
  }

  if (accentHex && isValidHex(accentHex)) {
    const hsl = hexToHSL(accentHex);
    if (hsl) {
      const baseHsl = isDark ? generateDarkVariant(hsl) : hsl;
      const cssVal = hslToCssValue(baseHsl);
      const fgVal = computeForeground(baseHsl);

      root.style.setProperty("--accent", cssVal);
      root.style.setProperty("--accent-foreground", fgVal);
      root.style.setProperty("--whatsapp", cssVal);
      root.style.setProperty("--chart-2", cssVal);
    }
  }
}

export function useBrandColors() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (!settings) return;

    const primaryHex = settings.brand_primary_color;
    const accentHex = settings.brand_accent_color;

    if (!primaryHex && !accentHex) return;

    applyColors(primaryHex, accentHex);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          applyColors(primaryHex, accentHex);
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [settings]);
}

export { hexToHSL, hslToCssValue, isValidHex };
