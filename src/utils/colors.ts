export const PALETTE = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  gray: '#6b7280'
};

export function getColorName(hex: string): string | null {
  const upper = hex.toUpperCase();
  for (const [name, color] of Object.entries(PALETTE)) {
    if (color.toUpperCase() === upper) return name;
  }
  return null;
}

export function getContrastColor(hex: string): string {
  // Simple contrast calculation
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
