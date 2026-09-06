import { NextRequest } from 'next/server'

// Generates an SVG evidence photo for incidents.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const scenes: Record<string, { label: string; hue: number; icon: string }> = {
    'suspicious-van': { label: 'Suspicious Vehicle — Visitor Parking', hue: 25, icon: 'van' },
    'blocked-exit': { label: 'Blocked Emergency Exit', hue: 12, icon: 'boxes' },
    'fire-damage': { label: 'Fire Damage Evidence', hue: 30, icon: 'fire' },
    'equipment-failure': { label: 'Equipment Failure', hue: 220, icon: 'cam' },
    'unauthorized-access': { label: 'Unauthorized Access', hue: 0, icon: 'door' },
  }
  const scene = scenes[slug] ?? { label: slug, hue: 20, icon: 'box' }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(${scene.hue}, 40%, 22%)" />
        <stop offset="100%" stop-color="hsl(${scene.hue}, 45%, 10%)" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#bg)" />
    <g opacity="0.4" fill="hsl(${scene.hue}, 50%, 40%)">
      <rect x="60" y="220" width="240" height="120" rx="6" />
      <rect x="80" y="240" width="200" height="80" rx="4" fill="hsl(${scene.hue}, 55%, 50%)" opacity="0.7" />
    </g>
    <g transform="translate(40,40)">
      <rect width="300" height="44" rx="6" fill="#1c1917" opacity="0.8" />
      <circle cx="22" cy="22" r="8" fill="#ef4444" />
      <text x="42" y="28" font-family="ui-monospace, monospace" font-size="16" font-weight="700" fill="#fca5a5">EVIDENCE PHOTO</text>
    </g>
    <text x="40" y="430" font-family="ui-monospace, monospace" font-size="16" fill="#fef2f2" font-weight="600">${scene.label}</text>
    <text x="600" y="460" text-anchor="end" font-family="ui-monospace, monospace" font-size="13" fill="#fecaca" opacity="0.85">${new Date().toISOString().slice(0, 19).replace('T', ' ')}</text>
  </svg>`

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
