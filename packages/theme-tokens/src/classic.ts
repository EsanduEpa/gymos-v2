/** V1 Classic colors shared by the web presentation layer. */
export const classicTokens = {
  brand: {
    primary: "#007A35",
    primaryHover: "#00622A",
    onPrimary: "#FFFFFF",
    focus: "#45B472",
    soft: "#EAF5EE",
    border: "#BBEBD0",
  },
  surface: {
    page: "#F4F5F7",
    default: "#FFFFFF",
    muted: "#F5F4F5",
    hover: "#F9FAFB",
  },
  text: {
    primary: "#171B28",
    secondary: "#4A4D58",
    muted: "#8B8E98",
  },
  border: "#E1E1E4",
  navigation: {
    background: "#171B28",
    text: "#FFFFFF",
    muted: "#A4A7B0",
    hover: "#202534",
    border: "#232736",
  },
  status: {
    success: { foreground: "#146142", background: "#DDF5E7", border: "#BBEBD0" },
    warning: { foreground: "#8A3F00", background: "#FFF0E0", border: "#FFD8B3" },
    danger: { foreground: "#A31319", background: "#FDE4E4", border: "#F8B4B4" },
    info: { foreground: "#1D4ED8", background: "#EFF6FF", border: "#BFDBFE" },
    neutral: { foreground: "#4A4D58", background: "#F5F4F5", border: "#E1E1E4" },
  },
  chart: ["#007A35", "#4C956C", "#78AA8C", "#A9C6B4", "#C8DDD0"],
} as const;

export type ClassicTokens = typeof classicTokens;
export type GymPrimaryColor = `#${string}`;
export type GymBrandColors = Readonly<{
  primary: GymPrimaryColor;
  onPrimary: typeof classicTokens.brand.onPrimary | typeof classicTokens.text.primary;
}>;

/** Accept only the public API's six-digit hex form before using a gym accent. */
export function resolveGymPrimaryColor(value: string | null | undefined): GymPrimaryColor {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() as GymPrimaryColor : classicTokens.brand.primary;
}

function relativeLuminance(color: GymPrimaryColor): number {
  const channels = color.slice(1).match(/.{2}/g)?.map((part) => Number.parseInt(part, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function contrastRatio(first: GymPrimaryColor, second: GymPrimaryColor): number {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

/** Keep the gym accent while selecting a foreground with WCAG AA normal-text contrast. */
export function resolveGymBrandColors(value: string | null | undefined): GymBrandColors {
  const primary = resolveGymPrimaryColor(value);
  const light = classicTokens.brand.onPrimary;
  const dark = classicTokens.text.primary;
  return {
    primary,
    onPrimary: contrastRatio(primary, light) >= contrastRatio(primary, dark) ? light : dark,
  };
}

export const classicFontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
