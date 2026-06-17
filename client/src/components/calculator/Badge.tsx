import type { NRRBand } from '../../lib/nrr'

// Determine legible text color from a hex background using relative luminance.
function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1E293B' : '#FFFFFF'
}

interface BadgeProps {
  band: NRRBand | null
}

export function Badge({ band }: BadgeProps) {
  if (!band) return null

  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-300"
      style={{ backgroundColor: band.color, color: getTextColor(band.color) }}
    >
      {band.label}
    </span>
  )
}
