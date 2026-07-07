import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { formatarData } from '../../core/date-format';
import { dataPorExtenso, saudacaoPorHora } from '../../core/greeting';
import { statusVisual } from '../../core/status-sessao';
import { CriarExcecaoPayload, Qlick, Sessao, Turma } from '../../core/models';
import { linksPainel } from '../../core/nav-links';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { IconButton } from '../../ui/icon-button/icon-button';
import { Spinner } from '../../ui/spinner/spinner';
import { OnboardingCard } from '../../ui/onboarding-card/onboarding-card';
import { ExcecaoModal } from './excecao-modal';

/**
 * DashboardPage (Smart Component): tela de recepção. Saudação personalizada,
 * contexto de tempo e foco na próxima aula.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, IconButton, Spinner, ExcecaoModal, OnboardingCard],
  template: `
    <header class="greeting">
      <h1>Olá, {{ saudacao }}{{ nome() ? ', ' + nome() : '' }}!</h1>
      <p class="data">Hoje é {{ dataHoje }}.</p>
    </header>

    <div class="actions">
      <a class="btn-outline" routerLink="/turmas/nova">Nova turma</a>
      <app-icon-button name="alert" variant="primary" (clicked)="abrirExcecao()">
        Exceção
      </app-icon-button>
    </div>

    <nav class="atalhos">
      @for (l of atalhos(); track l.path) {
        <a class="atalho" [routerLink]="l.path" [queryParams]="l.query ?? null">
          <span class="atalho__ic"><app-icon [name]="l.icon" [size]="26" /></span>
          <span class="atalho__lbl">
            {{ l.label }}
            @if (l.locked) { <app-icon class="atalho__lock" name="lock" [size]="13" /> }
          </span>
        </a>
      }
    </nav>

    @if (mostrarOnboarding()) {
      <app-onboarding-card
        [faltaNome]="faltaNome()"
        [faltaUsername]="faltaUsername()"
        [faltaFoto]="faltaFoto()"
      />
    }

    @if (loading()) {
      <div class="loading">
        <app-spinner [size]="32" />
        <span class="muted">Carregando sua agenda…</span>
      </div>
    } @else {
      @if (proxima(); as p) {
        <app-card [title]="emAndamento() ? 'Aula em andamento' : 'Próxima aula'">
          <div class="proxima">
            <div class="proxima__info">
              <span class="proxima__data">
                {{ formatarData(p.data) }}
                @if (emAndamento()) { <span class="badge-live">Em andamento</span> }
              </span>
              @if (proximaTurma(); as t) {
                <span class="proxima__turma">
                  <span class="dot" [style.background]="t.cor || 'var(--primary)'"></span>
                  {{ t.nome }}
                  @if (t.disciplina) {
                    <span class="proxima__disc">· {{ t.disciplina }}</span>
                  }
                  @if (t.horaInicio && t.horaFim) {
                    <span class="proxima__hora">· {{ t.horaInicio }}–{{ t.horaFim }}</span>
                  }
                </span>
              }
            </div>
            <span class="proxima__num">Aula {{ p.numero }}</span>
          </div>

          @if (topicoProximo(); as topico) {
            <div class="assunto" [style.--cor]="proximaTurma()?.cor || 'var(--primary)'">
              Assunto de hoje: <strong>{{ topico }}</strong>
            </div>
          }
          @if (contextoProximo(); as ctx) {
            <details class="plano" [open]="!topicoProximo()">
              <summary>Plano de aula da disciplina</summary>
              <p class="plano__txt">{{ ctx }}</p>
            </details>
          }
        </app-card>
      } @else {
        <app-card>
          <p class="muted empty">
            Nenhuma aula agendada. Crie uma turma para o Tichr projetar sua grade.
          </p>
        </app-card>
      }

      @if (qlickProximaTurma(); as q) {
        <a class="qlick-aviso" routerLink="/jogos/qlick">
          <span class="qlick-aviso__ic"><app-icon name="game" [size]="22" /></span>
          <span class="qlick-aviso__txt">
            <strong>Qlick pronto para {{ proximaTurma()?.nome }}</strong>
            <span>“{{ q.titulo }}” — toque para rodar na próxima aula</span>
          </span>
          <span class="qlick-aviso__seta">→</span>
        </a>
      }

      <a class="btn-outline ver-agenda" routerLink="/agenda">Ver agenda completa</a>
    }

    <app-excecao-modal
      [open]="excecaoAberta()"
      [loading]="salvandoExcecao()"
      (confirmar)="salvarExcecao($event)"
      (fechar)="excecaoAberta.set(false)"
    />
  `,
  styles: `
    .greeting {
      margin-bottom: 1.25rem;
    }
    .greeting h1 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .greeting .data {
      margin: 0.25rem 0 0;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .atalhos {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    @media (min-width: 560px) { .atalhos { grid-template-columns: repeat(3, 1fr); } }
    app-onboarding-card { display: block; margin-bottom: 1.5rem; }
    .atalho {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.1rem 0.5rem;
      border-radius: 16px;
      text-decoration: none;
      color: inherit;
      background: var(--surface);
      border: 1px solid var(--border);
      transition: transform 0.08s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .atalho:hover { border-color: var(--primary); box-shadow: 4px 4px 0 var(--border); }
    .atalho:active { transform: translateY(2px); box-shadow: none; }
    .atalho__ic {
      display: grid; place-items: center;
      width: 52px; height: 52px; border-radius: 14px;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .atalho__lbl { font-weight: 700; font-size: 0.9rem; text-align: center; display: inline-flex; align-items: center; gap: 0.3rem; }
    .atalho__lock { color: var(--text-muted); }
    @media (prefers-reduced-motion: reduce) { .atalho { transition: none; } .atalho:active { transform: none; } }
    .proxima {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.4rem 0.75rem;
      flex-wrap: wrap;
    }
    .proxima__info { min-width: 0; }
    .proxima__data {
      display: block;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--primary);
    }
    .badge-live {
      display: inline-block;
      vertical-align: middle;
      margin-left: 0.5rem;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #fff;
      background: var(--success, #16a34a);
    }
    .proxima__turma {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.25rem;
      font-weight: 600;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      display: inline-block;
    }
    .proxima__hora, .proxima__disc {
      color: var(--text-muted);
      font-weight: 500;
    }
    .assunto {
      margin-top: 0.9rem;
      padding: 0.7rem 0.9rem;
      border-radius: var(--radius);
      border-left: 4px solid var(--cor, var(--primary));
      background: color-mix(in srgb, var(--cor, var(--primary)) 10%, transparent);
      font-size: 1.05rem;
    }
    .assunto strong { color: var(--cor, var(--primary)); }
    .plano { margin-top: 0.75rem; }
    .plano summary { cursor: pointer; font-weight: 600; color: var(--text-muted); font-size: 0.9rem; }
    .plano__txt { margin: 0.5rem 0 0; white-space: pre-wrap; color: var(--text); }
    .proxima__num {
      font-weight: 600;
      color: var(--text-muted);
    }
    .ver-agenda {
      display: inline-flex;
      margin-top: 0.875rem;
      text-decoration: none;
    }
    .qlick-aviso {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.875rem;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      color: #fff;
      text-decoration: none;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      box-shadow: 0 10px 30px color-mix(in srgb, #7c3aed 30%, transparent);
    }
    .qlick-aviso__ic { flex: 0 0 auto; display: inline-flex; }
    .qlick-aviso__txt { display: flex; flex-direction: column; min-width: 0; }
    .qlick-aviso__txt strong { font-weight: 800; }
    .qlick-aviso__txt span { font-size: 0.82rem; opacity: 0.92; }
    .qlick-aviso__seta { margin-left: auto; font-weight: 800; font-size: 1.2rem; }
    .onboarding h3 {
      margin: 0 0 0.375rem;
      font-size: 1.1rem;
    }
    .onboarding p {
      margin: 0 0 1rem;
    }
    .onboarding .btn-primary {
      text-decoration: none;
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 3rem 0;
      color: var(--primary);
    }
    .muted { color: var(--text-muted); }
    .empty { margin: 0; }
  `,
})
export class DashboardPage {
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);

  private readonly agora = new Date();
  /** "Agora" reativo: atualiza a cada minuto p/ o status por horário reagir sozinho. */
  private readonly relogio = signal(new Date());
  protected readonly saudacao = saudacaoPorHora(this.agora);
  protected readonly dataHoje = dataPorExtenso(this.agora);
  protected readonly nome = this.profileService.nome;
  protected readonly perfilCarregado = signal(false);
  protected readonly mostrarOnboarding = computed(
    () => this.perfilCarregado() && this.profileService.perfilIncompleto(),
  );
  protected readonly faltaNome = computed(
    () => !this.profileService.profile()?.nomeExibicao?.trim(),
  );
  protected readonly faltaUsername = computed(
    () => !this.profileService.profile()?.username?.trim(),
  );
  protected readonly faltaFoto = computed(
    () => !this.profileService.profile()?.avatarUrl?.trim(),
  );

  /** Acesso rápido: espelha o menu lateral (mesma fonte), menos o próprio Dashboard. */
  protected readonly atalhos = computed(() =>
    linksPainel(this.profileService.profile()?.planoAtual).filter(
      (l) => l.path !== '/dashboard',
    ),
  );

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sessoes = signal<Sessao[]>([]);
  protected readonly turmas = signal<Map<string, Turma>>(new Map());
  protected readonly excecaoAberta = signal(false);
  protected readonly salvandoExcecao = signal(false);

  // Plano de aula: contexto geral por disciplina (Graduado+) e tópico da próxima aula (Mestre+).
  private readonly planos = signal<Map<string, string>>(new Map());
  protected readonly topicoProximo = signal<string | null>(null);
  private topicoCarregadoPara = '';

  protected readonly formatarData = formatarData;

  /** Contexto geral do plano da disciplina da próxima aula (Graduado+). */
  protected readonly contextoProximo = computed<string | null>(() => {
    const t = this.proximaTurma();
    if (
      !t?.disciplina ||
      !planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'GRADUADO')
    ) {
      return null;
    }
    return this.planos().get(t.disciplina) ?? null;
  });

  /**
   * Aula em foco: a que está em andamento agora, ou a próxima agendada. Cruza a
   * data da sessão com os horários da turma (`statusVisual`), então uma aula
   * some do painel assim que o horário dela termina — não só quando o dia vira.
   */
  protected readonly proxima = computed<Sessao | null>(() => {
    const agora = this.relogio();
    const turmas = this.turmas();
    const candidatas = this.sessoes()
      .filter((s) => s.status === 'AGENDADA')
      .map((s) => {
        const t = turmas.get(s.turmaId);
        return { s, st: statusVisual(s, t?.horaInicio, t?.horaFim, agora) };
      })
      .filter((c) => c.st === 'EM_ANDAMENTO' || c.st === 'AGENDADA');
    // Em andamento primeiro; depois a agendada mais próxima.
    candidatas.sort(
      (a, b) =>
        (a.st === 'EM_ANDAMENTO' ? 0 : 1) - (b.st === 'EM_ANDAMENTO' ? 0 : 1) ||
        a.s.data.localeCompare(b.s.data) ||
        a.s.numero - b.s.numero,
    );
    return candidatas[0]?.s ?? null;
  });

  /** Turma da próxima aula (para exibir nome + cor). */
  protected readonly proximaTurma = computed<Turma | null>(() => {
    const p = this.proxima();
    return p ? (this.turmas().get(p.turmaId) ?? null) : null;
  });

  /** Verdadeiro quando a aula em foco está acontecendo agora (dentro do horário). */
  protected readonly emAndamento = computed<boolean>(() => {
    const p = this.proxima();
    const t = this.proximaTurma();
    return (
      !!p &&
      statusVisual(p, t?.horaInicio, t?.horaFim, this.relogio()) ===
        'EM_ANDAMENTO'
    );
  });

  /** Qlicks do professor (PhD) — para avisar se há um pronto na próxima turma. */
  private readonly qlicks = signal<Qlick[]>([]);
  protected readonly qlickProximaTurma = computed<Qlick | null>(() => {
    const t = this.proximaTurma();
    if (!t) return null;
    return this.qlicks().find((q) => q.turmaId === t.id) ?? null;
  });

  constructor() {
    // "Agora" avança a cada minuto para que a aula em foco reaja ao relógio
    // (vira "em andamento" e depois some) sem precisar recarregar a página.
    const timer = setInterval(() => this.relogio.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // Paralelismo: perfil+turmas (BFF /home) e sessões da semana disparam juntos
    // via forkJoin — o tempo de tela é o da requisição mais lenta, sem cascata.
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      home: this.profileService.loadHome(),
      sessoes: this.api.getSessoesSemana(),
    }).subscribe({
      next: ({ home, sessoes }) => {
        this.perfilCarregado.set(true);
        this.turmas.set(new Map(home.turmas.map((t) => [t.id, t])));
        this.sessoes.set(sessoes);
        this.loading.set(false);

        const plano = home.profile.planoAtual;
        if (planoAtendeMinimo(plano, 'GRADUADO')) {
          this.api.getPlanosAula().subscribe((ps) =>
            this.planos.set(new Map(ps.map((p) => [p.disciplina, p.contextoGeral]))),
          );
        }
        if (planoAtendeMinimo(plano, 'PHD')) {
          this.api.getQlicks().subscribe({
            next: (qs) => this.qlicks.set(qs),
            error: () => {},
          });
        }
        this.enriquecerProxima();
      },
      error: () => {
        this.perfilCarregado.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Recarrega apenas as sessões (após registrar uma exceção). */
  carregar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getSessoesSemana().subscribe({
      next: (sessoes) => {
        this.sessoes.set(sessoes);
        this.loading.set(false);
        this.enriquecerProxima();
      },
      error: () => this.loading.set(false),
    });
  }

  /** Carrega o tópico alocado à próxima aula (Graduado+, dono do quadro modular). */
  private enriquecerProxima(): void {
    const p = this.proxima();
    const t = this.proximaTurma();
    const plano = this.profileService.profile()?.planoAtual;
    if (!p || !t?.disciplina || !planoAtendeMinimo(plano, 'GRADUADO')) {
      return;
    }
    const chave = `${t.id}:${p.numero}`;
    if (this.topicoCarregadoPara === chave) {
      return;
    }
    this.topicoCarregadoPara = chave;
    this.api.getAlocacoes(t.id).subscribe((alocs) => {
      const aloc = alocs.find((a) => a.numeroAula === p.numero);
      if (!aloc) {
        this.topicoProximo.set(null);
        return;
      }
      this.api.getTopicos(t.disciplina!).subscribe((tops) =>
        this.topicoProximo.set(
          tops.find((x) => x.id === aloc.topicoId)?.nome ?? null,
        ),
      );
    });
  }

  protected abrirExcecao(): void {
    this.excecaoAberta.set(true);
  }

  protected salvarExcecao(payload: CriarExcecaoPayload): void {
    this.salvandoExcecao.set(true);
    this.api.criarExcecao(payload).subscribe({
      next: () => {
        this.salvandoExcecao.set(false);
        this.excecaoAberta.set(false);
        this.carregar();
      },
      error: () => {
        this.salvandoExcecao.set(false);
        this.excecaoAberta.set(false);
      },
    });
  }
}
