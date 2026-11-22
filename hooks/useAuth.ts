"use client";

import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { E2E_USER, IS_E2E, getFirebaseAuth, googleProvider } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_E2E) {
      // e2e: entra como o dono, depois da hidratação (a pré-renderização é igual à de produção).
      const t = setTimeout(() => {
        setUser(E2E_USER as unknown as User);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, pass: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, pass);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, googleProvider);
  }, []);

  // Também serve para DEFINIR a senha de uma conta criada só com Google: o link do
  // e-mail adiciona o provedor "senha" à mesma conta e confirma o e-mail.
  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  }, []);

  return { user, loading, signIn, signInWithGoogle, resetPassword, signOut };
}
