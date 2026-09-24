# PatrolTrack — Firebase Setup Guide

## ⚠️ IMPORTANT: This project uses Firebase Firestore (NOT SQLite/Prisma)

## Prerequisites

1. **Node.js 18+** — Download from https://nodejs.org/
2. **VS Code** — Download from https://code.visualstudio.com/
3. **A Firebase project** (free) — See steps below

## Step 1: Create a Firebase Project

1. Go to https://console.firebase.google.com/
2. Sign in with your Google account
3. Click **"Add project"** → name it `patroltrack` → continue
4. Once created, click **"Firestore Database"** → **"Create database"**
5. Choose **"Start in test mode"** (so you can write data during development)
6. Select a location near you → Click **"Enable"

## Step 2: Get Your Firebase Service Account Key

1. In Firebase Console, click the **⚙️ gear icon** (Project Settings) next to "Project Overview"
2. Go to the **"Service accounts"** tab
3. Click **"Generate new private key"** → a JSON file will download
4. **Rename the file** to: `patroltrack-fyp-firebase-adminsdk-fbsvc-6aaafee6e7.json`
5. **Place this file in the project root folder** (same folder as `package.json`)

## Step 3: Install and Run

Open VS Code terminal (Terminal → New Terminal) and run:

```powershell
# 1. Install dependencies
npm install

# 2. Seed the database with demo data
npx tsx prisma/seed.ts
```

If `tsx` is not found:
```powershell
npm install -g tsx
npx tsx prisma/seed.ts
```

## Step 4: Start the Realtime Service (for live GPS tracking)

Open a **second terminal** in VS Code (click the **+** icon):
```powershell
cd mini-services\realtime-service
npm install
npm run dev
```
Keep this terminal running.

## Step 5: Start the Main App

Back in your **first terminal**:
```powershell
npm run dev
```

## Step 6: Open the App

Open your browser to: **http://localhost:3000**

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@patroltrack.io | admin123 |
| Supervisor | hafiz@patroltrack.io | super123 |
| Security Guard | ahmad@patroltrack.io | guard123 |

## Troubleshooting

### "No service account key file found"
- Make sure your JSON key file is in the **project root folder**
- The file should be named exactly: `patroltrack-fyp-firebase-adminsdk-fbsvc-6aaafee6e7.json`
- Check the terminal output — it will tell you which filenames it's looking for

### "Permission denied" or Firestore errors
- In Firebase Console, make sure Firestore is in **test mode**
- Check that your JSON key file is valid (open it — it should start with `{` and end with `}`)

### "tsx is not recognized"
```powershell
npm install -g tsx
```

### Port 3000 already in use
- Change the port in `package.json`: `"dev": "next dev -p 3001"`
- Then open `http://localhost:3001`

### Realtime map not working
- Make sure the realtime service (Step 4) is running on port 3003
- You need TWO terminals running at the same time

## File Structure

```
patroltrack/
├── patroltrack-fyp-firebase-adminsdk-fbsvc-6aaafee6e7.json  ← YOUR KEY FILE
├── package.json
├── .env
├── src/
│   └── lib/
│       └── firebase.ts          ← Firebase connection
├── prisma/
│   └── seed.ts                  ← Seeds Firestore with demo data
└── mini-services/
    └── realtime-service/        ← Socket.IO for live tracking
```
