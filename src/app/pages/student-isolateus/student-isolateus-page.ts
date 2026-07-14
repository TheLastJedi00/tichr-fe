import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { IsolateusMatch, PainelIsolateus } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { StudentAuthService } from '../../core/student-auth.service';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Spinner } from '../../ui/spinner/spinner';

/** Duração da animação do Despertar (revelação de papéis). */
const REVELACAO_MS = 3000;

/**
 * O celular do habitante. Descobre a investigação da turma sozinho (sonda de 4s,
 * como o Qlick e o Wor), entra com um pseudônimo e passa pelo Despertar.
 *
 * O papel — e, para a Ameaça, a resposta correta — vem do `painel()`, uma rota
 * autenticada. **Nunca** do snapshot: o documento que este componente escuta é
 * cego de propósito, e é isso que impede um aluno com DevTools de descobrir o
 * infiltrado.
 */
@Component({
  selector: 'app-student-isolateus-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner, LobbyLoader],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="30" /></div>
    } @else if (partida(); as p) {
      @if (p.status === 'LOBBY') {
        <!-- O Prólogo e o Registro -->
        <section class="dossie">
          <span class="dossie__tag">ARQUIVO: ISOLATEUS</span>
          <p>
            A vila está isolada no extremo norte. Luzes cortaram o céu e uma
            estrutura metálica afundou na floresta. Desde então, moradores
            desaparecem à noite. A ameaça já está aqui — disfarçada entre vocês.
          </p>
        </section>

        @if (inscrito(p)) {
          <div class="espera">
            <app-lobby-loader />
            <strong>Aguardando Comando Central</strong>
            <p class="muted">
              Você entrou como <b>{{ meuPseudonimo(p) }}</b>. O professor está
              auditando os nomes.
            </p>
          </div>
        } @else {
          <form class="registro" (submit)="entrar($event)">
            @if (vetado()) {
              <p class="aviso">Seu nome foi vetado pelo Comando Central. Escolha outro.</p>
            }
            <label class="campo">
              <span>Seu nome de personagem</span>
              <input
                class="tichr-input"
                maxlength="24"
                [value]="pseudonimo()"
                (input)="pseudonimo.set($any($event.target).value)"
                placeholder="Ex: Corvo Pálido"
              />
            </label>
            <p class="muted">
              Ninguém usa o nome verdadeiro. O pseudônimo evita perseguições
              pessoais e mantém o foco na lógica.
            </p>
            @if (erro()) { <p class="aviso">{{ erro() }}</p> }
            <button class="btn-iso full" type="submit" [disabled]="enviando() || pseudonimo().trim().length < 2">
              {{ enviando() ? 'Registrando…' : 'Entrar na vila' }}
            </button>
          </form>
        }
      } @else if (revelando()) {
        <!-- O Despertar -->
        <section class="revelacao" [class.revelacao--ameaca]="ehAmeaca()">
          <app-icon [name]="ehAmeaca() ? 'alien' : 'shield'" [size]="52" />
          <strong>{{ ehAmeaca() ? 'Você é a Ameaça' : 'Você é um Aldeão' }}</strong>
          <p>
            @if (ehAmeaca()) {
              Sabote os setores, abduza moradores e espalhe desinformação. Não
              deixe que descubram você.
            } @else {
              Deduza quem é a ameaça e vote nas alternativas corretas para salvar
              a vila.
            }
          </p>
        </section>
      } @else {
        <p class="lead">A investigação começou. (Interface de jogo na próxima etapa.)</p>
      }
    } @else {
      <section class="vazio">
        <app-icon name="alien" [size]="40" />
        <h1>Nenhuma investigação agora</h1>
        <p class="muted">Quando o professor abrir a vila, ela aparece aqui.</p>
        <a class="btn-outline" routerLink="/aluno/dashboard">Voltar ao início</a>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: #4d7c0f; }
    .lead { font-weight: 700; }
    .muted { color: var(--text-muted); font-size: 0.9rem; }
    .dossie { padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border); border-left: 4px solid #84cc16; border-radius: 14px; background: var(--surface); }
    .dossie__tag { display: block; margin-bottom: 0.4rem; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.18em; color: #4d7c0f; }
    .dossie p { margin: 0; color: var(--text-muted); line-height: 1.55; font-size: 0.92rem; }
    .espera { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem 1rem; text-align: center; }
    .espera strong { font-size: 1.1rem; }
    .registro { display: flex; flex-direction: column; gap: 0.5rem; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }
    .aviso { margin: 0; color: var(--danger); font-weight: 600; font-size: 0.9rem; }
    .btn-iso { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.9rem 1.2rem; border: none; border-radius: 12px; cursor: pointer; font: inherit; font-weight: 800; color: #fff; background: linear-gradient(135deg, #84cc16, #4d7c0f); }
    .btn-iso:disabled { opacity: 0.55; cursor: not-allowed; }
    .full { width: 100%; margin-top: 0.5rem; }
    .revelacao {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.75rem; min-height: 60vh; text-align: center; border-radius: 18px; padding: 2rem 1.25rem;
      color: #fff; background: #2563eb; animation: pulsar 1.2s ease-in-out infinite;
    }
    .revelacao--ameaca { background: #4d7c0f; }
    .revelacao strong { font-size: 1.6rem; font-weight: 900; }
    .revelacao p { margin: 0; max-width: 22rem; opacity: 0.95; line-height: 1.5; }
    @keyframes pulsar { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
    @media (prefers-reduced-motion: reduce) { .revelacao { animation: none; } }
    .vazio { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 3rem 1rem; text-align: center; color: #4d7c0f; }
    .vazio h1 { margin: 0; font-size: 1.2rem; color: var(--text); }
    .vazio .btn-outline { text-decoration: none; margin-top: 0.5rem; }
  `,
})
export class StudentIsolateusPage {
  private readonly api = inject(IsolateusApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly studentAuth = inject(StudentAuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly meuId = this.studentAuth.aluno()?.id ?? '';

  protected readonly partida = signal<IsolateusMatch | null>(null);
  protected readonly painel = signal<PainelIsolateus | null>(null);
  protected readonly carregando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly erro = signal('');
  protected readonly pseudonimo = signal('');
  /** O professor vetou o pseudônimo: o aluno some dos inscritos e volta ao registro. */
  protected readonly vetado = signal(false);
  protected readonly revelando = signal(false);

  protected readonly ehAmeaca = computed(
    () => this.painel()?.papel === 'AMEACA',
  );

  private partidaId: string | null = null;
  private jaEntrei = false;

  constructor() {
    this.buscar();
    // Sonda até a investigação aparecer (mesmo padrão do Qlick e do Wor).
    const sonda = setInterval(() => {
      if (!this.partida()) this.buscar();
    }, 4000);
    this.destroyRef.onDestroy(() => clearInterval(sonda));
  }

  private buscar(): void {
    this.api.partidaAtual().subscribe({
      next: (p) => {
        this.carregando.set(false);
        if (p && p.id !== this.partidaId) {
          this.partidaId = p.id;
          this.partida.set(p);
          this.escutar(p.id);
        } else if (!p) {
          this.partida.set(null);
        }
      },
      error: () => this.carregando.set(false),
    });
  }

  private escutar(partidaId: string): void {
    this.realtime
      .escutarIsolateus(partidaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          if (!p) return;
          this.reagir(p);
          this.partida.set(p);
        },
        error: () => {},
      });
  }

  /** Reage às transições de estado que exigem buscar o painel (o segredo). */
  private reagir(p: IsolateusMatch): void {
    const anterior = this.partida();

    // Vetado no lobby: eu estava inscrito e sumi da lista.
    if (p.status === 'LOBBY' && this.jaEntrei && !this.inscrito(p)) {
      this.jaEntrei = false;
      this.vetado.set(true);
    }

    // O Despertar: a partida saiu do lobby → busca o papel e roda a animação.
    const saiuDoLobby =
      anterior?.status === 'LOBBY' && p.status !== 'LOBBY';
    if (saiuDoLobby || (p.status !== 'LOBBY' && !this.painel())) {
      this.carregarPainel(saiuDoLobby);
    }
  }

  /**
   * Busca o papel do aluno. Só a Ameaça recebe a resposta correta e os disfarces
   * — o Aldeão não recebe nada sobre os outros, então nem uma inspeção do
   * payload lhe dá vantagem.
   */
  private carregarPainel(comRevelacao: boolean): void {
    if (!this.partidaId) return;
    this.api.painel(this.partidaId).subscribe({
      next: (pnl) => {
        this.painel.set(pnl);
        if (comRevelacao) {
          this.revelando.set(true);
          setTimeout(() => this.revelando.set(false), REVELACAO_MS);
        }
      },
      error: () => {},
    });
  }

  protected inscrito(p: IsolateusMatch): boolean {
    return p.inscritos.some((i) => i.alunoId === this.meuId);
  }

  protected meuPseudonimo(p: IsolateusMatch): string {
    return p.inscritos.find((i) => i.alunoId === this.meuId)?.nome ?? '—';
  }

  protected entrar(ev: Event): void {
    ev.preventDefault();
    const nome = this.pseudonimo().trim();
    if (!this.partidaId || nome.length < 2 || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set('');
    this.api.entrar(this.partidaId, nome).subscribe({
      next: () => {
        this.enviando.set(false);
        this.jaEntrei = true;
        this.vetado.set(false);
      },
      error: (e: { error?: { message?: string } }) => {
        this.enviando.set(false);
        this.erro.set(
          e.error?.message ?? 'Não foi possível registrar esse nome.',
        );
      },
    });
  }
}
