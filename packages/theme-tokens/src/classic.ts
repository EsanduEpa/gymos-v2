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

/** Accept only the public API's six-digit hex form before using a gym accent. */
export function resolveGymPrimaryColor(value: string | null | undefined): GymPrimaryColor {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() as GymPrimaryColor : classicTokens.brand.primary;
}

export const classicFontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
