import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { environment } from '../../environments/environment';

/**
 * App web do Firebase (config pública) compartilhado por todo o frontend.
 * `initializeApp` só pode rodar uma vez para o app [DEFAULT] — este helper
 * garante um único ponto de inicialização entre Realtime (Qlick) e Storage (foto).
 */
export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(environment.firebase);
}
