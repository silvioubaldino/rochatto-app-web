import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

/**
 * Build de e2e (`NEXT_PUBLIC_E2E=1`): o Playwright roda contra a api simulada, sem Google/Firebase.
 * Nunca ligado em produção (a variável só existe no job de e2e).
 */
export const IS_E2E = process.env.NEXT_PUBLIC_E2E === "1";
export const E2E_USER = {
  displayName: "Dono (e2e)",
  email: "dono@e2e.test",
  photoURL: null,
  getIdToken: () => Promise.resolve("e2e-token"),
};

let _auth: Auth | undefined;
export function getFirebaseAuth(): Auth {
  if (IS_E2E) return { authStateReady: () => Promise.resolve(), currentUser: E2E_USER } as unknown as Auth;
  if (!_auth) {
    _auth = getAuth(getApp());
  }
  return _auth;
}

export const googleProvider = new GoogleAuthProvider();
// Sempre deixa escolher a conta (evita entrar sem querer com outra conta Google logada).
googleProvider.setCustomParameters({ prompt: "select_account" });

let _db: Firestore | undefined;
export function getFirestoreDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getApp());
  }
  return _db;
}
