import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  type Firestore,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { firebaseApp } from './firebase-app';
import { Partida, WorMatch, WorTeam } from './models';

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

  // --- Tichr Wor (estado fragmentado) ---

  /** Raiz da partida (`matches/{id}`) — o projetor e o aluno escutam. */
  escutarMatch(matchId: string): Observable<WorMatch | null> {
    return new Observable<WorMatch | null>((sub) => {
      const ref = doc(this.conectar(), 'matches', matchId);
      const unsub = onSnapshot(
        ref,
        (snap) =>
          sub.next(snap.exists() ? ({ id: snap.id, ...snap.data() } as WorMatch) : null),
        (err) => sub.error(err),
      );
      return () => unsub();
    });
  }

  /** Todas as equipes (`matches/{id}/teams`) — o projetor precisa da guerra toda. */
  escutarTeams(matchId: string): Observable<WorTeam[]> {
    return new Observable<WorTeam[]>((sub) => {
      const ref = collection(this.conectar(), 'matches', matchId, 'teams');
      const unsub = onSnapshot(
        ref,
        (snap) =>
          sub.next(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorTeam),
          ),
        (err) => sub.error(err),
      );
      return () => unsub();
    });
  }

  /**
   * Apenas o doc da PRÓPRIA equipe (`matches/{id}/teams/{teamId}`). O celular do
   * aluno escuta só isto: dano/cura no seu castelo dispara barato, sem receber
   * gatilho quando outras equipes se enfrentam.
   */
  escutarTeam(matchId: string, teamId: string): Observable<WorTeam | null> {
    return new Observable<WorTeam | null>((sub) => {
      const ref = doc(this.conectar(), 'matches', matchId, 'teams', teamId);
      const unsub = onSnapshot(
        ref,
        (snap) =>
          sub.next(snap.exists() ? ({ id: snap.id, ...snap.data() } as WorTeam) : null),
        (err) => sub.error(err),
      );
      return () => unsub();
    });
  }
}
