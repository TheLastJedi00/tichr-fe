import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { Aluno, ProgressoTurma, QlickDoDia, Sessao, WorMatchView } from '../../core/models';
import { StudentAuthService } from '../../core/student-auth.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { WorApiService } from '../../core/wor-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';
import { XpBar } from '../../ui/xp-bar/xp-bar';

/** Dashboard do aluno: saudação + barra de XP/nível + atalhos. */
@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, Spinner, XpBar],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <h1 class="ola">Olá, {{ nome() }} <app-icon name="wave" [size]="20" /></h1>

      <div class="stack">
      @if (qlickDoDia(); as q) {
        <a class="qlick" routerLink="/aluno/qlick">
          <span class="qlick__pulse"></span>
          <span>
            <strong>Tichr Qlick de hoje</strong>
            <span class="qlick__sub">{{ q.titulo }} · toque para entrar</span>
          </span>
          <span class="qlick__seta">→</span>
        </a>
      }

      @if (worDoDia(); as w) {
        <a class="qlick qlick--wor" routerLink="/aluno/wor">
          <span class="qlick__pulse"></span>
          <span>
            <strong>Tichr Wor de hoje</strong>
            <span class="qlick__sub">{{ w.match.nome }} · toque para entrar</span>
          </span>
          <span class="qlick__seta">→</span>
        </a>
      }

      @if (proxima(); as p) {
        <app-card>
          <span class="prox__lbl">Próxima aula · {{ formatarData(p.data) }}</span>
          @if (proximoTopico(); as t) {
            <p class="prox__topico">O que vem por aí: <strong>{{ t }}</strong></p>
          } @else {
            <p class="prox__vazio">Aula {{ p.numero }}</p>
          }
        </app-card>
      }

      <app-card>
        <app-xp-bar [xp]="xp()" [unidade]="nomePontuacao()" [limiares]="niveis()" />
      </app-card>

      @if (progresso(); as p) {
        <app-card>
          <div class="evolucao">
            <div class="evolucao__top">
              <span class="evolucao__tit">Evolução da turma</span>
              <span class="evolucao__pct">{{ p.pct }}%</span>
            </div>
            <div class="trilho"><div class="trilho__fill" [style.width.%]="p.pct"></div></div>
            <span class="evolucao__sub">{{ p.concluidas }} de {{ p.total }} aulas concluídas</span>
          </div>
        </app-card>
      }

      <div class="atalhos">
        <a class="atalho" routerLink="/aluno/agenda">
          <app-icon name="calendar" [size]="24" />
          <span>Minha agenda</span>
        </a>
        <a class="atalho" routerLink="/aluno/ranking">
          <app-icon name="trophy" [size]="24" />
          <span>Ranking da turma</span>
        </a>
      </div>
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .ola { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
    .stack { display: flex; flex-direction: column; gap: 1rem; }
    .atalhos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .atalho {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem 1rem;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--primary);
      font-weight: 600;
      text-align: center;
    }
    .atalho:hover { border-color: var(--primary); }
    .evolucao__top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.4rem; }
    .evolucao__tit { font-weight: 700; }
    .evolucao__pct { font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; }
    .trilho { height: 12px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .trilho__fill { height: 100%; border-radius: 999px; background: var(--primary); transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
    .evolucao__sub { display: block; margin-top: 0.4rem; font-size: 0.85rem; color: var(--text-muted); }
    .prox__lbl { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
    .prox__topico { margin: 0.4rem 0 0; font-size: 1.05rem; }
    .prox__topico strong { color: var(--primary); }
    .prox__vazio { margin: 0.4rem 0 0; color: var(--text-muted); }
    .qlick { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; border-radius: 14px; color: #fff; background: linear-gradient(135deg, #7c3aed, #2563eb); box-shadow: 0 10px 30px color-mix(in srgb, #7c3aed 30%, transparent); }
    .qlick strong { display: block; }
    .qlick__sub { font-size: 0.82rem; opacity: 0.9; }
    .qlick__seta { margin-left: auto; font-weight: 800; font-size: 1.2rem; }
    .qlick--wor { background: linear-gradient(135deg, #b45309, #7c2d12); box-shadow: 0 10px 30px color-mix(in srgb, #b45309 30%, transparent); }
    .qlick__pulse { flex: 0 0 auto; width: 12px; height: 12px; border-radius: 999px; background: #fff; animation: qpulse 1.2s ease-in-out infinite; }
    @keyframes qpulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.6); } 50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); } }
    @media (prefers-reduced-motion: reduce) { .qlick__pulse { animation: none; } }
  `,
})
export class StudentDashboardPage {
  private readonly api = inject(TurmaApiService);
  private readonly worApi = inject(WorApiService);
  private readonly studentAuth = inject(StudentAuthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly formatarData = formatarData;

  protected readonly carregando = signal(true);
  protected readonly nome = signal(this.studentAuth.aluno()?.nome ?? '');
  protected readonly xp = signal(this.studentAuth.aluno()?.xpTotal ?? 0);
  protected readonly nomePontuacao = this.studentAuth.nomePontuacao;
  /** Cortes de patente da TURMA (vêm do login) — sem eles a barra cai nos defaults. */
  protected readonly niveis = this.studentAuth.niveis;
  protected readonly progresso = signal<ProgressoTurma | null>(null);
  protected readonly qlickDoDia = signal<QlickDoDia | null>(null);
  protected readonly worDoDia = signal<WorMatchView | null>(null);
  private readonly sessoes = signal<Sessao[]>([]);
  private readonly topicos = signal<Map<number, string>>(new Map());
  private readonly hoje = new Date().toISOString().slice(0, 10);

  /** Próxima aula agendada (menor data ≥ hoje, não cancelada). */
  protected readonly proxima = computed(() =>
    this.sessoes()
      .filter((s) => s.data >= this.hoje && s.status !== 'CANCELADA')
      .sort((a, b) => a.data.localeCompare(b.data))
      .at(0),
  );
  protected readonly proximoTopico = computed(() => {
    const p = this.proxima();
    return p ? this.topicos().get(p.numero) : undefined;
  });

  constructor() {
    // Recarrega o perfil para refletir o XP mais recente.
    this.api.getMeuPerfil().subscribe({
      next: (aluno: Aluno) => {
        this.nome.set(aluno.nome);
        this.xp.set(aluno.xpTotal ?? 0);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
    this.api.getMeuProgresso().subscribe({
      next: (p) => this.progresso.set(p),
      error: () => {},
    });
    this.api.getMinhaAgenda().subscribe({
      next: (s) => this.sessoes.set(s),
      error: () => {},
    });
    this.api.getMeuPlano().subscribe({
      next: (r) =>
        this.topicos.set(new Map(r.topicos.map((t) => [t.numeroAula, t.topico]))),
      error: () => {},
    });
    // Sonda os jogos do dia (Qlick e Wor): o card surge assim que o professor
    // roda a partida, sem o aluno recarregar. Para quando a partida já apareceu.
    this.buscarQlick();
    this.buscarWor();
    const sonda = setInterval(() => {
      if (!this.qlickDoDia()) this.buscarQlick();
      if (!this.worDoDia()) this.buscarWor();
    }, 5000);
    this.destroyRef.onDestroy(() => clearInterval(sonda));
  }

  private buscarQlick(): void {
    this.api.getQlickDoDia().subscribe({
      next: (q) => this.qlickDoDia.set(q),
      error: () => {},
    });
  }

  private buscarWor(): void {
    this.worApi.partidaAtual().subscribe({
      next: (w) => this.worDoDia.set(w),
      error: () => {},
    });
  }
}
