import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, type Auth } from 'firebase/auth';
import { getDatabase, onValue, ref, type Database, type Unsubscribe } from 'firebase/database';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Passo } from '../isolateus/cenas/cenas.data';
import { IsolateusApiService } from './isolateus-api.service';

/** O nome do app Firebase separado do canal (a sessão do app principal é outra). */
const APP_CANAL = 'isolateus-canal';

/**
 * O canal de posição ao vivo (spec 034 #3, #5): o celular entra numa instância
 * Firebase SEPARADA com um custom token `{ partidaId, setorId }` emitido pelo
 * backend e assina só `pos/{partida}/{meuSetor}`. As rules liberam a leitura só
 * desse setor; ninguém escreve (só o backend). A cada amanhecer o setor muda e
 * o celular pede um token novo.
 *
 * A posição é cosmética: nada aqui decide a partida.
 */
@Injectable({ providedIn: 'root' })
export class IsolateusCanalService implements OnDestroy {
  private readonly api = inject(IsolateusApiService);
  private app?: FirebaseApp;
  private auth?: Auth;
  private db?: Database;
  private parar?: Unsubscribe;
  private setorAtual: string | null = null;

  /** Os últimos `{ x, alvoX, t }` de cada habitante do meu setor. */
  readonly posicoes = signal<Record<string, Passo>>({});
  /** O canal está ligado (token válido e assinatura ativa)? */
  readonly conectado = signal(false);

  private iniciar(): void {
    if (this.app) return;
    this.app = getApps().some((a) => a.name === APP_CANAL)
      ? getApp(APP_CANAL)
      : initializeApp(environment.firebase, APP_CANAL);
    this.auth = getAuth(this.app);
    this.db = getDatabase(this.app);
  }

  /**
   * Liga o canal do setor atual do habitante. Chamar de novo para o mesmo setor
   * não faz nada; para outro setor, troca a assinatura com um token novo.
   */
  async conectar(partidaId: string, setorId: string): Promise<void> {
    if (this.setorAtual === setorId && this.conectado()) return;
    this.desligar();
    this.setorAtual = setorId;
    try {
      this.iniciar();
      const { token } = await firstValueFrom(this.api.canal(partidaId));
      await signInWithCustomToken(this.auth!, token);
      // O setor pode ter mudado durante o pedido do token.
      if (this.setorAtual !== setorId) return;
      this.parar = onValue(
        ref(this.db!, `pos/${partidaId}/${setorId}`),
        (snap) => {
          this.posicoes.set((snap.val() as Record<string, Passo> | null) ?? {});
        },
        () => this.conectado.set(false),
      );
      this.conectado.set(true);
    } catch {
      // Sem canal (RTDB não configurado, token recusado): o jogo segue só com o
      // Firestore, e os bonecos ficam parados no lugar de origem.
      this.conectado.set(false);
    }
  }

  /** Para a assinatura e esquece as posições (troca de setor, fim de partida). */
  desligar(): void {
    this.parar?.();
    this.parar = undefined;
    this.conectado.set(false);
    this.posicoes.set({});
  }

  ngOnDestroy(): void {
    this.desligar();
    this.setorAtual = null;
  }
}
