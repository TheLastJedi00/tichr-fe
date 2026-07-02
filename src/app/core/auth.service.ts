import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { firebaseConfig } from './firebase.config';

/**
 * Autenticacao no frontend via Firebase Auth (email/senha).
 * Expõe o usuario atual como signal e resgata o ID token para o interceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth: Auth = getAuth(initializeApp(firebaseConfig));

  /** Usuario logado (null quando deslogado). */
  readonly user = signal<User | null>(null);
  /** Vira true quando o Firebase resolve o estado inicial de auth. */
  readonly ready = signal(false);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.ready.set(true);
    });
  }

  login(email: string, senha: string): Promise<unknown> {
    return signInWithEmailAndPassword(this.auth, email, senha);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  /** ID token JWT atual (ou null se deslogado) para o header Authorization. */
  getToken(): Promise<string | null> {
    const current = this.auth.currentUser;
    return current ? current.getIdToken() : Promise.resolve(null);
  }
}
