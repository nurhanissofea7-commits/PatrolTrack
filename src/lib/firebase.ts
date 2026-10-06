// PatrolTrack – Firebase Admin SDK client
// Works in both local development (JSON file) and Vercel production (env variables)

import * as admin from 'firebase-admin'

let serviceAccount: any = null
let initError: string | null = null

// ─── Method 1: Base64-encoded JSON (BULLETPROOF — use this on Vercel) ──────
// This avoids ALL private key formatting issues.
// Set FIREBASE_SERVICE_ACCOUNT_BASE64 to the base64-encoded JSON key file.
if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const jsonStr = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    serviceAccount = JSON.parse(jsonStr)
    console.log('[firebase] Using base64-encoded service account')
  } catch (e: any) {
    initError = `Base64 decode error: ${e.message}`
    console.error('[firebase] ' + initError)
  }
}

// ─── Method 2: Individual environment variables ────────────────────────────
if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    
    // Handle the private key format — convert literal \n to real newlines
    if (privateKey) {
      // If the key has actual line breaks (Vercel converted \n to newlines), convert them back
      if (privateKey.includes('\n') && !privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\n/g, '\\n')
      }
      // Now convert literal \n to real newlines for the SDK
      privateKey = privateKey.replace(/\\n/g, '\n')
    }

    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || '',
    }
    console.log('[firebase] Using individual environment variables')
  } catch (e: any) {
    initError = `Env var parsing error: ${e.message}`
    console.error('[firebase] ' + initError)
  }
}

// ─── Method 3: JSON file (used in local development) ───────────────────────
if (!serviceAccount && process.env.NODE_ENV !== 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync, existsSync } = require('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('path')
    
    const KEY_FILE_NAMES = [
      'patroltrack-fyp-firebase-adminsdk-fbsvc-6aaafee6e7.json',
      'firebase-service-account.json',
      'service-account.json',
    ]

    for (const name of KEY_FILE_NAMES) {
      const paths = [
        join(process.cwd(), name),
        join(process.cwd(), 'upload', name),
      ]
      for (const p of paths) {
        if (existsSync(p)) {
          try {
            serviceAccount = JSON.parse(readFileSync(p, 'utf-8'))
            console.log(`[firebase] Loaded key file: ${name}`)
            break
          } catch {
            // ignore parse errors
          }
        }
      }
      if (serviceAccount) break
    }
  } catch (e) {
    // fs module not available (Vercel production) — that's OK
  }
}

// ─── Initialize Firebase Admin ──────────────────────────────────────────────
let firestoreInstance: FirebaseFirestore.Firestore | null = null

try {
  if (!admin.apps || admin.apps.length === 0) {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log(`[firebase] Connected to project: ${serviceAccount.project_id}`)
    } else {
      admin.initializeApp()
      console.warn('[firebase] No credentials found, using default')
    }
  }
  firestoreInstance = admin.firestore()
} catch (e: any) {
  initError = `Initialization error: ${e.message}`
  console.error('[firebase] ' + initError)
}

// Export a dummy firestore if initialization failed, so imports don't crash
const firestore = firestoreInstance || ({} as FirebaseFirestore.Firestore)

// ─── Collection helpers ────────────────────────────────────────────────────

type DocData = Record<string, any>

export function generateId(): string {
  try {
    return firestore.collection('_').doc().id
  } catch {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}

// Convert Firestore Timestamps to ISO strings for JSON serialization
function convertTimestamps(data: any): any {
  if (data === null || data === undefined) return data
  if (data && typeof data === 'object') {
    if (data._seconds !== undefined || (data.seconds !== undefined && data.nanoseconds !== undefined)) {
      const seconds = data._seconds ?? data.seconds
      const nanoseconds = data._nanoseconds ?? data.nanoseconds ?? 0
      return new Date(seconds * 1000 + nanoseconds / 1e6).toISOString()
    }
    if (typeof data.toDate === 'function') {
      return data.toDate().toISOString()
    }
    if (data instanceof Date) {
      return data.toISOString()
    }
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

// ─── Database object ────────────────────────────────────────────────────────
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
  _initError: initError,
}

export default db