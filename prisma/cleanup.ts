// PatrolTrack – Firestore cleanup script
// Deletes ALL documents in ALL collections, then you re-seed fresh.
// Run with: npx tsx prisma/cleanup.ts

import { db } from '../src/lib/firebase'

const COLLECTIONS = [
  'users',
  'guards',
  'supervisors',
  'locations',
  'patrolRoutes',
  'checkpoints',
  'patrolSchedules',
  'patrolSessions',
  'checkpointVerifications',
  'incidents',
  'emergencyAlerts',
  'notifications',
  'announcements',
  'auditLogs',
  'systemSettings',
]

async function main() {
  console.log('🧹 Cleaning Firestore database...\n')

  for (const name of COLLECTIONS) {
    const docs = await db._firestore.collection(name).get()
    if (docs.empty) {
      console.log(`  ${name}: empty (skipped)`)
      continue
    }
    console.log(`  ${name}: deleting ${docs.size} document(s)...`)
    const batch = db._firestore.batch()
    docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    console.log(`  ${name}: ✓ deleted`)
  }

  console.log('\n✅ Cleanup complete! Now run: npx tsx prisma/seed.ts')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})