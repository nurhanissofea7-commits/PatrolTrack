import { NextRequest } from 'next/server'

// Generates a stylized "security camera photo" SVG for a checkpoint.
// Looks like a night-vision CCTV frame with timestamp overlay.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const now = new Date()
  const ts = now.toISOString().replace('T', ' ').slice(0, 19)

  const scenes: Record<string, { label: string; hue: number; building: string }> = {
    'A-CP01': { label: 'Main Entrance', hue: 200, building: 'entrance' },
    'A-CP02': { label: 'Ground Lobby', hue: 210, building: 'lobby' },
    'A-CP03': { label: 'Reception Desk', hue: 195, building: 'desk' },
    'A-CP04': { label: 'East Stairwell', hue: 180, building: 'stairs' },
    'A-CP05': { label: 'Server Room Door', hue: 160, building: 'server' },
    'A-CP06': { label: 'Emergency Exit B1', hue: 220, building: 'exit' },
    'A-CP07': { label: 'Roof Access', hue: 240, building: 'roof' },
    'A-CP08': { label: 'Loading Bay Rear', hue: 190, building: 'dock' },
    'P-CP01': { label: 'Main Gate', hue: 175, building: 'gate' },
    'P-CP02': { label: 'Visitor Parking', hue: 200, building: 'parking' },
    'P-CP03': { label: 'North Fence', hue: 185, building: 'fence' },
    'P-CP04': { label: 'Loading Dock', hue: 205, building: 'dock' },
    'P-CP05': { label: 'Staff Parking', hue: 195, building: 'parking' },
    'B-CP01': { label: 'B Entrance', hue: 215, building: 'entrance' },
    'B-CP02': { label: 'B Lobby', hue: 200, building: 'lobby' },
    'B-CP03': { label: 'Warehouse Floor', hue: 180, building: 'warehouse' },
    'B-CP04': { label: 'Cold Storage', hue: 165, building: 'cold' },
    'B-CP05': { label: 'Fire Panel', hue: 230, building: 'panel' },
    'B-CP06': { label: 'B Exit', hue: 210, building: 'exit' },
  }
  const scene = scenes[code] ?? { label: code, hue: 200, building: 'generic' }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(${scene.hue}, 30%, 12%)" />
        <stop offset="100%" stop-color="hsl(${scene.hue}, 35%, 6%)" />
      </linearGradient>
      <radialGradient id="vig" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="hsl(${scene.hue}, 40%, 28%)" stop-opacity="0.55" />
        <stop offset="100%" stop-color="hsl(${scene.hue}, 40%, 5%)" stop-opacity="0" />
      </radialGradient>
      <pattern id="noise" width="3" height="3" patternUnits="userSpaceOnUse">
        <rect width="3" height="3" fill="hsl(${scene.hue}, 25%, 14%)" />
        <circle cx="1" cy="1" r="0.4" fill="hsl(${scene.hue}, 30%, 22%)" opacity="0.5" />
      </pattern>
    </defs>
    <rect width="640" height="480" fill="url(#bg)" />
    <rect width="640" height="480" fill="url(#noise)" opacity="0.6" />
    <rect width="640" height="480" fill="url(#vig)" />

    <!-- Scene silhouette -->
    <g opacity="0.85">
      <rect x="0" y="300" width="640" height="180" fill="hsl(${scene.hue}, 25%, 8%)" />
      <rect x="40" y="180" width="180" height="140" fill="hsl(${scene.hue}, 22%, 14%)" stroke="hsl(${scene.hue}, 30%, 22%)" stroke-width="2" />
      <rect x="260" y="140" width="140" height="180" fill="hsl(${scene.hue}, 22%, 12%)" stroke="hsl(${scene.hue}, 30%, 22%)" stroke-width="2" />
      <rect x="440" y="200" width="160" height="120" fill="hsl(${scene.hue}, 22%, 13%)" stroke="hsl(${scene.hue}, 30%, 22%)" stroke-width="2" />
      <rect x="60" y="200" width="40" height="60" fill="hsl(${scene.hue}, 40%, 30%)" opacity="0.5" />
      <rect x="280" y="170" width="30" height="50" fill="hsl(${scene.hue}, 40%, 30%)" opacity="0.4" />
      <rect x="470" y="220" width="35" height="55" fill="hsl(${scene.hue}, 40%, 30%)" opacity="0.5" />
    </g>

    <!-- Checkpoint sign -->
    <g transform="translate(40,40)">
      <rect width="220" height="58" rx="6" fill="hsl(${scene.hue}, 60%, 45%)" opacity="0.95" />
      <text x="14" y="26" font-family="ui-monospace, monospace" font-size="20" font-weight="700" fill="white">CHECKPOINT</text>
      <text x="14" y="48" font-family="ui-monospace, monospace" font-size="16" fill="white" opacity="0.9">${code}</text>
    </g>

    <!-- Timestamp overlay (CCTV style) -->
    <g font-family="ui-monospace, monospace" fill="hsl(${scene.hue}, 60%, 70%)">
      <text x="640" y="448" text-anchor="end" font-size="18" font-weight="600">${ts}</text>
      <text x="640" y="470" text-anchor="end" font-size="14" opacity="0.85">CAM-${code.replace(/[^A-Z0-9]/g, '')} · ${scene.label.toUpperCase()}</text>
    </g>

    <!-- REC indicator -->
    <g transform="translate(40,440)">
      <circle cx="0" cy="0" r="7" fill="#ef4444" />
      <text x="14" y="5" font-family="ui-monospace, monospace" font-size="14" fill="#ef4444" font-weight="700">REC</text>
    </g>

    <!-- Subtle scan lines -->
    <g opacity="0.06">
      ${Array.from({ length: 48 }, (_, i) => `<rect x="0" y="${i * 10}" width="640" height="1" fill="white" />`).join('')}
    </g>
  </svg>`

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
