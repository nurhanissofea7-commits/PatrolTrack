# PatrolTrack — Local Setup Guide

## Prerequisites

1. **Node.js 18+** — Download from https://nodejs.org/
2. **npm** (comes with Node.js) or **bun** (faster, recommended) — https://bun.sh/

## Installation Steps

### 1. Unzip the project
```
unzip patroltrack.zip
cd patroltrack
```

### 2. Install dependencies
```
npm install
```
Or with bun (faster):
```
bun install
```

### 3. Set up the database
```
npx prisma generate
npx prisma db push
```
Then seed the demo data:
```
npx tsx prisma/seed.ts
```
Or with bun:
```
bun run prisma/seed.ts
```

### 4. Start the realtime service (for live GPS tracking)
Open a NEW terminal window:
```
cd mini-services/realtime-service
npm install
npm run dev
```
Keep this terminal running.

### 5. Start the main application
Back in the FIRST terminal:
```
npm run dev
```

### 6. Open the app
Open your browser to:
```
http://localhost:3000
```

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@patroltrack.io | admin123 |
| Supervisor | hafiz@patroltrack.io | super123 |
| Security Guard | ahmad@patroltrack.io | guard123 |

## Troubleshooting

- **Port 3000 already in use**: Change the port in package.json ("dev" script)
- **Database errors**: Delete `db/custom.db` and re-run `npx prisma db push` + seed
- **Realtime not working**: Make sure the realtime service (step 4) is running on port 3003
- **Can't find tsx**: Run `npm install -g tsx` or use `bun run prisma/seed.ts`
