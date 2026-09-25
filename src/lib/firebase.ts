// PatrolTrack – Firebase Admin SDK client
// Replaces Prisma. Reads the service account key from a JSON file in the project root.

import * as admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Try to find the Firebase service account key file
const KEY_FILE_NAMES = [
  'patroltrack-fyp-firebase-adminsdk-fbsvc-6aaafee6e7.json',
  'firebase-service-account.json',
  'service-account.json',
]

let serviceAccount: any = null

for (const name of KEY_FILE_NAMES) {
  const paths = [
    join(process.cwd(), name),
    join(process.cwd(), 'upload', name),
    join(__dirname, '..', '..', name),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        serviceAccount = JSON.parse(readFileSync(p, 'utf-8'))
        break
      } catch {
        // ignore parse errors
      }
    }
  }
  if (serviceAccount) break
}

// Also check environment variables
if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || '',
  }
}

// Initialize Firebase Admin (only once)
if (!admin.apps || admin.apps.length === 0) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log(`[firebase] Connected to project: ${serviceAccount.project_id}`)
  } else {
    console.warn('[firebase] ⚠️  No service account key file found.')
    console.warn('[firebase] Place your Firebase JSON key file in the project root.')
    console.warn('[firebase] Expected one of:', KEY_FILE_NAMES.join(', '))
    admin.initializeApp()
  }
}

const firestore = admin.firestore()

// ─── Collection helpers ────────────────────────────────────────────────────

type DocData = Record<string, any>

export function generateId(): string {
  return firestore.collection('_').doc().id
}

// Convert Firestore Timestamps to ISO strings for JSON serialization.
// Firestore returns dates as { seconds, nanoseconds } or Timestamp objects.
// The frontend expects ISO strings so `new Date()` works.
function convertTimestamps(data: any): any {
  if (data === null || data === undefined) return data
  if (data && typeof data === 'object') {
    // Firestore Timestamp object
    if (data._seconds !== undefined || (data.seconds !== undefined && data.nanoseconds !== undefined)) {
      const seconds = data._seconds ?? data.seconds
      const nanoseconds = data._nanoseconds ?? data.nanoseconds ?? 0
      return new Date(seconds * 1000 + nanoseconds / 1e6).toISOString()
    }
    // Firestore Timestamp class (has toDate method)
    if (typeof data.toDate === 'function') {
      return data.toDate().toISOString()
    }
    // Date object
    if (data instanceof Date) {
      return data.toISOString()
    }
    // Regular object — recurse
    const result: Record<string, any> = {}
    for (const [key, val] of Object.entries(data)) {
      result[key] = convertTimestamps(val)
    }
    return result
  }
  return data
}

function docToObj<T = DocData>(doc: FirebaseFirestore.DocumentSnapshot): (T & { id: string }) | null {
  if (!doc.exists) return null
  const data = doc.data() as T
  return { id: doc.id, ...convertTimestamps(data) }
}

function queryToArr<T = DocData>(snap: FirebaseFirestore.QuerySnapshot): (T & { id: string })[] {
  return snap.docs.map((d) => {
    const data = d.data() as T
    return { id: d.id, ...convertTimestamps(data) }
  })
}

// ─── Generic model wrapper ─────────────────────────────────────────────────
class Model<T extends DocData = DocData> {
  constructor(private collectionName: string) {}

  private col() {
    return firestore.collection(this.collectionName)
  }

  async findById(id: string): Promise<(T & { id: string }) | null> {
    const doc = await this.col().doc(id).get()
    return docToObj<T>(doc)
  }

  async findOne(field: string, value: any): Promise<(T & { id: string }) | null> {
    const snap = await this.col().where(field, '==', value).limit(1).get()
    if (snap.empty) return null
    return docToObj<T>(snap.docs[0])
  }

  async findMany(filters?: Record<string, any>): Promise<(T & { id: string })[]> {
    let query: FirebaseFirestore.Query = this.col()
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null) {
          query = query.where(key, '==', val)
        }
      }
    }
    const snap = await query.get()
    return queryToArr<T>(snap)
  }

  async findAll(): Promise<(T & { id: string })[]> {
    const snap = await this.col().get()
    return queryToArr<T>(snap)
  }

  async create(data: Partial<T> & { id?: string }): Promise<T & { id: string }> {
    const id = (data as any).id || generateId()
    const { id: _ignored, ...rest } = data
    const docData = { ...rest, createdAt: (data as any).createdAt || new Date(), updatedAt: new Date() }
    await this.col().doc(id).set(docData)
    return { ...(docData as T), id }
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const updateData = { ...data, updatedAt: new Date() }
    await this.col().doc(id).set(updateData, { merge: true })
  }

  async delete(id: string): Promise<void> {
    await this.col().doc(id).delete()
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query: FirebaseFirestore.Query = this.col()
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null) {
          query = query.where(key, '==', val)
        }
      }
    }
    const snap = await query.get()
    return snap.size
  }
}

// ─── Database object (mimics Prisma's db) ──────────────────────────────────
export const db = {
  user: new Model<any>('users'),
  guard: new Model<any>('guards'),
  supervisor: new Model<any>('supervisors'),
  location: new Model<any>('locations'),
  patrolRoute: new Model<any>('patrolRoutes'),
  checkpoint: new Model<any>('checkpoints'),
  patrolSchedule: new Model<any>('patrolSchedules'),
  patrolSession: new Model<any>('patrolSessions'),
  checkpointVerification: new Model<any>('checkpointVerifications'),
  incident: new Model<any>('incidents'),
  emergencyAlert: new Model<any>('emergencyAlerts'),
  notification: new Model<any>('notifications'),
  announcement: new Model<any>('announcements'),
  auditLog: new Model<any>('auditLogs'),
  systemSetting: new Model<any>('systemSettings'),

  _firestore: firestore,
  _generateId: generateId,
}

export default db
