import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CheckUsernameResponse,
  HomePayload,
  IniciarCheckout,
  MetodoPagamento,
  PlanoAtual,
  Profile,
  StatusCobranca,
  UpdateProfilePayload,
} from './models';

/**
 * Perfil do professor: camada HTTP + estado reativo (signal) compartilhado.
 * Ao salvar, o signal atualiza e o greeting do Dashboard reflete na hora.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  readonly profile = signal<Profile | null>(null);
  readonly nome = computed(() => this.profile()?.nomeExibicao ?? null);

  /**
   * Soft-block do onboarding: perfil considerado incompleto enquanto faltar
   * nome, @username, foto ou ao menos uma disciplina. Usado para destacar o
   * card de conclusão no painel.
   */
  readonly perfilIncompleto = computed(() => {
    const p = this.profile();
    if (!p) return false;
    return (
      !p.nomeExibicao?.trim() ||
      !p.username?.trim() ||
      !p.avatarUrl?.trim() ||
      !p.disciplinas?.length
    );
  });

  load(): Observable<Profile> {
    return this.http
      .get<Profile>(`${this.base}/profile`)
      .pipe(tap((p) => this.profile.set(p)));
  }

  /**
   * Agregador do painel (BFF): perfil + turmas num único roundtrip. Atualiza o
   * perfil reativo (greeting) e devolve o payload completo para a página.
   */
  loadHome(): Observable<HomePayload> {
    return this.http
      .get<HomePayload>(`${this.base}/home`)
      .pipe(tap((h) => this.profile.set(h.profile)));
  }

  update(payload: UpdateProfilePayload): Observable<Profile> {
    return this.http
      .put<Profile>(`${this.base}/profile`, payload)
      .pipe(tap((p) => this.profile.set(p)));
  }

  /**
   * Sobe a foto de perfil pela API (multipart). O upload é server-side: o cliente
   * não tem sessão do Firebase Auth, então o Storage nega escrita anônima — quem
   * grava é o backend. Devolve o perfil já com o `avatarUrl` novo e atualiza o
   * signal (o avatar reflete na hora em todo o painel).
   */
  uploadAvatar(foto: Blob): Observable<Profile> {
    const form = new FormData();
    form.append('foto', foto, 'avatar.jpg');
    return this.http
      .post<Profile>(`${this.base}/profile/avatar`, form)
      .pipe(tap((p) => this.profile.set(p)));
  }

  /** Disponibilidade de um @username (debounce na tela de Configurações). */
  checkUsername(u: string): Observable<CheckUsernameResponse> {
    return this.http.get<CheckUsernameResponse>(
      `${this.base}/profile/check-username`,
      { params: { u } },
    );
  }

  /**
   * Inicia a compra de uma vaga avulsa. Não concede na hora: devolve a cobrança
   * pendente (PIX/cartão) para a tela de pagamento — exceto admin, que recebe
   * `{ concedido: true }` e tem o perfil recarregado.
   */
  comprarSlotAvulso(metodo: MetodoPagamento): Observable<IniciarCheckout> {
    return this.http
      .post<IniciarCheckout>(`${this.base}/checkout/slot-avulso`, { metodo })
      .pipe(tap((r) => this.aoConceder(r)));
  }

  /**
   * Inicia a troca de plano. Devolve a cobrança pendente para a tela de
   * pagamento; admin/destino gratuito voltam `{ concedido: true }` (aplicado
   * na hora, perfil recarregado).
   */
  upgradePlano(
    plano: PlanoAtual,
    metodo: MetodoPagamento,
    cupom?: string,
  ): Observable<IniciarCheckout> {
    return this.http
      .post<IniciarCheckout>(`${this.base}/checkout/upgrade`, {
        plano,
        metodo,
        ...(cupom ? { cupom } : {}),
      })
      .pipe(tap((r) => this.aoConceder(r)));
  }

  /**
   * Descarta o "plano pretendido" (checkout pendente do cadastro). A tela de
   * pagamento chama ao abrir, para o professor não ser trazido de volta ao
   * checkout a cada navegação se desistir. Limpa também o signal local.
   */
  descartarPlanoPretendido(): Observable<void> {
    return this.http.delete<void>(`${this.base}/profile/plano-pretendido`).pipe(
      tap(() => {
        const p = this.profile();
        if (p) this.profile.set({ ...p, planoPretendido: undefined });
      }),
    );
  }

  /** Status de uma cobrança (polling da tela de pagamento até PAID/EXPIRED). */
  statusCobranca(billingId: string): Observable<{ status: StatusCobranca }> {
    return this.http.get<{ status: StatusCobranca }>(
      `${this.base}/checkout/status/${billingId}`,
    );
  }

  /** Simula o pagamento (só existe em ambiente de testes/devMode). */
  simularPagamento(billingId: string): Observable<{ status: StatusCobranca }> {
    return this.http.post<{ status: StatusCobranca }>(
      `${this.base}/checkout/simular/${billingId}`,
      {},
    );
  }

  /** Recarrega o perfil quando o backend concede na hora (admin/gratuito). */
  private aoConceder(r: IniciarCheckout): void {
    if (r.concedido) this.load().subscribe();
  }

  /**
   * Auto-exclusão da conta: reautentica com a senha e apaga tudo (irreversível).
   * O chamador deve deslogar e sair da área logada em seguida.
   */
  excluirConta(senha: string): Observable<{ modo: 'soft' | 'hard' }> {
    return this.http.delete<{ modo: 'soft' | 'hard' }>(`${this.base}/profile`, {
      body: { senha },
    });
  }

  /** Aplica um cupom no checkout (100% de desconto ou meses grátis). */
  aplicarCupom(codigo: string): Observable<{
    aplicado: boolean;
    tipo: string;
    planoAtual?: PlanoAtual;
    cortesiaAte?: string;
  }> {
    return this.http
      .post<{ aplicado: boolean; tipo: string; planoAtual?: PlanoAtual; cortesiaAte?: string }>(
        `${this.base}/checkout/cupom`,
        { codigo },
      )
      .pipe(tap(() => this.load().subscribe()));
  }
}
