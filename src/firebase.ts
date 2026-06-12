// Firebase wiring — written but NOT imported yet.
// The app runs on the in-memory store (src/store.tsx) until roadmap step 1.
//
// When wiring begins:
//   1. Create a Firebase project at console.firebase.google.com
//   2. Enable Auth (email/password) and Firestore
//   3. Paste your web config below (or load from env vars)
//   4. Import { db, auth } from './firebase' in store.tsx and swap action bodies

import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO (wiring step): import getReactNativePersistence from the correct subpath for your
// Firebase SDK version and pass it to initializeAuth below. As of Firebase 10+:
//   import { getReactNativePersistence } from 'firebase/auth/react-native';
//   import AsyncStorage from '@react-native-async-storage/async-storage';
//   persistence: getReactNativePersistence(AsyncStorage)

const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

const app = initializeApp(firebaseConfig);

// Auth persistence in React Native requires AsyncStorage, not the web default.
// Add getReactNativePersistence(AsyncStorage) to the options object during wiring.
export const auth = initializeAuth(app, {});

export const db = getFirestore(app);
export const storage = getStorage(app);

// ── Intended Firestore layout ─────────────────────────────────────────────────
//
// families/{familyId}
// families/{familyId}/kids/{kidId}
// families/{familyId}/chores/{choreId}
// families/{familyId}/completions/{completionId}
// families/{familyId}/rewards/{rewardId}
// families/{familyId}/redemptions/{redemptionId}
// families/{familyId}/ledger/{entryId}   ← balance = sum of deltas (INVARIANT)
//
// ── Server-authoritative operations (Cloud Functions) ────────────────────────
//
// These must NEVER run on the client — Firestore security rules will block them:
//
// 1. Free-for-all atomic claim:
//    Transaction: read chore, check ownerId == null, set ownerId = kidId.
//    Concurrent claims: only one kid wins.
//
// 2. Awarding stars on approval:
//    Triggered by completion.status changing to 'approved'.
//    Writes the ledger entry. Client cannot write ledger directly.
//
// 3. "Chore completed" push notification to parent:
//    Triggered by new completion document.
//    Sends FCM push via parent's token stored on Family document.
//
// ── Auth model ────────────────────────────────────────────────────────────────
//
// Parents: real Firebase email/password accounts. familyId stored in custom claims.
// Kids: no Firebase account. PIN verified client-side against hashed value in
//       Firestore (kid document). PIN hash uses bcrypt via Cloud Function.
