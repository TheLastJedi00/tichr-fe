import { Injectable } from '@angular/core';
import {
  doc,
  getFirestore,
  onSnapshot,
  type Firestore,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { firebaseApp } from './firebase-app';
import { Partida } from './models';

/**
 * Único ponto de contato do frontend com o Firebase. Inicializa o app web
 * (config pública) e escuta, em tempo real, o documento da partida do Qlick.
 * Leitura apenas — nenhuma escrita parte do cliente (o backend é a fonte).
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private db?: Firestore;

  private conectar(): Firestore {
    if (!this.db) {
      this.db = getFirestore(firebaseApp());
    }
    return this.db;
  }

  /** Emite o estado da partida a cada mudança no Firestore. */
  escutarPartida(partidaId: string): Observable<Partida | null> {
    return new Observable<Partida | null>((sub) => {
      const ref = doc(this.conectar(), 'qlick_partidas', partidaId);
      const unsub = onSnapshot(
        ref,
        (snap) =>
          sub.next(snap.exists() ? ({ id: snap.id, ...snap.data() } as Partida) : null),
        (err) => sub.error(err),
      );
      return () => unsub();
    });
  }
}
