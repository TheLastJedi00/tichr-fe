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
import {
  Aluno,
  IsolateusMatch,
  ProgressoTurma,
  QlickDoDia,
  Sessao,
  WorMatchView,
} from '../../core/models';
import { StudentAuthService } from '../../core/student-auth.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { WorApiService } from '../../core/wor-api.service';
import { Card } from '../../ui/card/card';
import { CardJogoComponent } from '../../ui/card-jogo/card-jogo';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';
import { XpBar } from '../../ui/xp-bar/xp-bar';
import { TrabalhoApiService } from '../../core/trabalho-api.service';

/** Dashboard do aluno: saudação + barra de XP/nível + atalhos. */
@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, CardJogoComponent, Icon, Spinner, XpBar],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <h1 class="ola">Olá, {{ nome() }} <app-icon name="wave" [size]="20" /></h1>

      <div class="stack">
      @if (qlickDoDia(); as q) {
        <app-card-jogo
          jogo="qlick"
          titulo="Tichr Qlick de hoje"
          link="/aluno/qlick"
          [nome]="q.titulo"
          [status]="q.status"
          [entradaEncerraEm]="q.entradaEncerraEm"
          [participa]="q.participa"
          (zerou)="buscarQlick()"
        />
      }

      @if (worDoDia(); as w) {
        <app-card-jogo
          jogo="wor"
          titulo="Tichr Wor de hoje"
          link="/aluno/wor"
          [nome]="w.match.nome"
          [status]="w.match.status"
          [entradaEncerraEm]="w.match.entradaEncerraEm"
          [participa]="w.participa"
          (zerou)="buscarWor()"
        />
      }

      @if (isolateusDoDia(); as i) {
        <app-card-jogo
          jogo="iso"
          titulo="Tichr Isolateus de hoje"
          link="/aluno/isolateus"
          [nome]="i.nome"
          [status]="i.status"
          [entradaEncerraEm]="i.entradaEncerraEm"
          [participa]="i.participa"
          (zerou)="buscarIsolateus()"
        />
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
        <a class="atalho" routerLink="/aluno/denuncias">
          <app-icon name="flag" [size]="24" />
          <span>Denunciar</span>
        </a>
        <a class="atalho" routerLink="/aluno/perguntas">
          <app-icon name="chat" [size]="24" />
          <span>Perguntar ao professor</span>
        </a>
        @if (trabalhosDisponiveis()) {
        <a class="atalho atalho--largo" routerLink="/aluno/trabalhos">
          <app-icon name="book" [size]="24" />
          <span>Trabalhos</span>
          @if (trabalhosPendentes() > 0) {
            <span class="atalho__badge" [attr.aria-label]="trabalhosPendentes() + ' para entregar'">
              {{ trabalhosPendentes() }} para entregar
            </span>
          }
        </a>
        }
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
    .atalho--largo { grid-column: 1 / -1; }
    .atalho__badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.1rem 0.55rem;
      border-radius: 999px;
      background: var(--primary);
      color: var(--primary-contrast, #fff);
    }
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
  `,
})
export class StudentDashboardPage {
  private readonly api = inject(TurmaApiService);
  private readonly worApi = inject(WorApiService);
  private readonly isolateusApi = inject(IsolateusApiService);
  private readonly studentAuth = inject(StudentAuthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly formatarData = formatarData;

  protected readonly carregando = signal(true);
  private readonly trabalhoApi = inject(TrabalhoApiService);
  protected readonly trabalhosPendentes = signal(0);
  protected readonly trabalhosDisponiveis = signal(false);
  protected readonly nome = signal(this.studentAuth.aluno()?.nome ?? '');
  protected readonly xp = signal(this.studentAuth.aluno()?.xpTotal ?? 0);
  protected readonly nomePontuacao = this.studentAuth.nomePontuacao;
  /** Cortes de patente da TURMA (vêm do login) — sem eles a barra cai nos defaults. */
  protected readonly niveis = this.studentAuth.niveis;
  protected readonly progresso = signal<ProgressoTurma | null>(null);
  protected readonly qlickDoDia = signal<QlickDoDia | null>(null);
  protected readonly worDoDia = signal<WorMatchView | null>(null);
  protected readonly isolateusDoDia = signal<IsolateusMatch | null>(null);
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
    // Trabalhos ainda por entregar (spec 038): o contador do atalho.
    this.trabalhoApi.meus().subscribe({
      next: (l) => {
        this.trabalhosDisponiveis.set(true);
        this.trabalhosPendentes.set(l.filter((t) => t.estado === 'PENDENTE').length);
      },
      // 403 = professor fora do PhD: o atalho não aparece (sem modal, ver o interceptor).
      error: () => this.trabalhosDisponiveis.set(false),
    });
    this.api.getMeuPlano().subscribe({
      next: (r) =>
        this.topicos.set(new Map(r.topicos.map((t) => [t.numeroAula, t.topico]))),
      error: () => {},
    });
    // Sonda os jogos do dia: o card surge assim que o professor roda a partida,
    // sem o aluno recarregar. Continua enquanto a partida está no lobby (035):
    // é assim que o card descobre que a entrada fechou e se o aluno ficou dentro.
    this.buscarQlick();
    this.buscarWor();
    this.buscarIsolateus();
    const sonda = setInterval(() => {
      if (!this.qlickDoDia() || this.qlickDoDia()!.status === 'LOBBY') this.buscarQlick();
      if (!this.worDoDia() || this.worDoDia()!.match.status === 'LOBBY') this.buscarWor();
      if (!this.isolateusDoDia() || this.isolateusDoDia()!.status === 'LOBBY') {
        this.buscarIsolateus();
      }
    }, 5000);
    this.destroyRef.onDestroy(() => clearInterval(sonda));
  }

  protected buscarQlick(): void {
    this.api.getQlickDoDia().subscribe({
      next: (q) => this.qlickDoDia.set(q),
      error: () => {},
    });
  }

  protected buscarIsolateus(): void {
    this.isolateusApi.partidaAtual().subscribe({
      next: (i) => this.isolateusDoDia.set(i),
      error: () => {},
    });
  }

  protected buscarWor(): void {
    this.worApi.partidaAtual().subscribe({
      next: (w) => this.worDoDia.set(w),
      error: () => {},
    });
  }
}
