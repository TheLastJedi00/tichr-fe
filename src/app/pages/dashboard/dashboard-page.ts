import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { formatarData } from '../../core/date-format';
import { dataPorExtenso, saudacaoPorHora } from '../../core/greeting';
import { statusVisual } from '../../core/status-sessao';
import {
  CriarExcecaoPayload,
  Instituicao,
  IsolateusJogo,
  Qlick,
  Sessao,
  TipoTurno,
  Turma,
  WorJogo,
} from '../../core/models';
import { linksPainel, NavLink } from '../../core/nav-links';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import { gradeDoTurno, periodoDoDia } from '../../core/turno.util';
import { TurmaApiService } from '../../core/turma-api.service';
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { WorApiService } from '../../core/wor-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { IconButton } from '../../ui/icon-button/icon-button';
import { Spinner } from '../../ui/spinner/spinner';
import { OnboardingCard } from '../../ui/onboarding-card/onboarding-card';
import { ExcecaoModal } from './excecao-modal';

/** Aviso de jogo (Qlick ou Wor) pronto para a próxima aula. */
interface AvisoJogo {
  tipo: 'Qlick' | 'Wor' | 'Isolateus';
  titulo: string;
  rota: string;
}

/** Próxima entrada de ensino regular (grade da escola × alocações da turma). */
interface EntradaRegular {
  data: string;
  periodo: number;
  horaInicio: string;
  horaFim: string;
  escola: string;
  serie: string;
  turmaId: string;
  turmaNome: string;
  cor?: string;
  turno?: TipoTurno;
  /** Escola com uma aula por turno → omite o "Nº horário" na mensagem. */
  aulaUnica: boolean;
}

const DIAS_SEMANA_DASH = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDiasIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
function weekdayIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function horaEmMin(h: string): number {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
}

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

    @if (mostrarOnboarding()) {
      <app-onboarding-card
        [faltaNome]="faltaNome()"
        [faltaUsername]="faltaUsername()"
        [faltaFoto]="faltaFoto()"
        [faltaDisciplinas]="faltaDisciplinas()"
      />
    }

    @if (loading()) {
      <div class="loading">
        <app-spinner [size]="32" />
        <span class="muted">Carregando sua agenda…</span>
      </div>
    } @else {
      @if (usarRegular()) {
        @if (proximaRegular(); as r) {
          <app-card title="Próxima aula">
            <p class="proxima-reg">
              {{ abreRegular() }} você
              @if (r.aulaUnica) {
                tem aula na escola <strong>{{ r.escola }}</strong> com a turma do
                <strong>{{ r.serie }}</strong>.
              } @else {
                entra no <strong>{{ r.periodo }}º horário</strong> na escola
                <strong>{{ r.escola }}</strong> com a turma do
                <strong>{{ r.serie }}</strong>.
              }
            </p>
            <div class="proxima__turma">
              <span class="dot" [style.background]="r.cor || 'var(--primary)'"></span>
              {{ r.turmaNome }}
              <span class="proxima__hora">· {{ r.horaInicio }}–{{ r.horaFim }}</span>
            </div>
            <a class="btn-outline detalhes-turma" [routerLink]="['/turmas', r.turmaId]">
              <app-icon name="building" [size]="16" /> Detalhes da turma
            </a>
          </app-card>
        }
      } @else if (proxima(); as p) {
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
          @if (proximaTurma(); as t) {
            <a class="btn-outline detalhes-turma" [routerLink]="['/turmas', t.id]">
              <app-icon name="building" [size]="16" /> Detalhes da turma
            </a>
          }
        </app-card>
      } @else {
        <app-card>
          <p class="muted empty">
            Nenhuma aula agendada. Crie uma turma para o Tichr projetar sua grade.
          </p>
        </app-card>
      }

      @for (jg of jogosProximaAula(); track jg.tipo + '::' + jg.titulo) {
        <a
          class="jogo-aviso"
          [class.jogo-aviso--wor]="jg.tipo === 'Wor'"
          [class.jogo-aviso--iso]="jg.tipo === 'Isolateus'"
          [routerLink]="jg.rota"
        >
          <span class="jogo-aviso__ic">
            <app-icon [name]="jg.tipo === 'Isolateus' ? 'alien' : 'game'" [size]="22" />
          </span>
          <span class="jogo-aviso__txt">
            <strong>{{ jg.tipo }} pronto para {{ proximaTurma()?.nome }}</strong>
            <span>“{{ jg.titulo }}” — toque para rodar na próxima aula</span>
          </span>
          <span class="jogo-aviso__seta">→</span>
        </a>
      }

      <a class="btn-outline ver-agenda" routerLink="/agenda">Ver agenda completa</a>
    }

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

    <app-excecao-modal
      [open]="excecaoAberta()"
      [loading]="salvandoExcecao()"
      (confirmar)="salvarExcecao($event)"
      (fechar)="excecaoAberta.set(false)"
    />
  `,
  styles: `
    /* Gap padrão entre os blocos da página — evita cards colados (ex.: card da
       próxima aula x grid de atalhos). Os blocos NÃO usam margin vertical
       própria; o espaçamento é sempre este gap. */
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    /* O modal fica fora do fluxo (position: fixed) — não deve virar item do flex
       nem criar um gap fantasma no fim da página. */
    app-excecao-modal {
      display: contents;
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
      flex-wrap: wrap;
    }
    .atalhos {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (min-width: 560px) { .atalhos { grid-template-columns: repeat(3, 1fr); } }
    app-onboarding-card { display: block; }
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
    .proxima-reg {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
      line-height: 1.5;
    }
    .proxima-reg strong { color: var(--primary); }
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
      text-decoration: none;
    }
    .detalhes-turma {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.9rem;
      text-decoration: none;
    }
    .jogo-aviso {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      color: #fff;
      text-decoration: none;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      box-shadow: 0 10px 30px color-mix(in srgb, #7c3aed 30%, transparent);
    }
    .jogo-aviso--wor {
      background: linear-gradient(135deg, #ea580c, #dc2626);
      box-shadow: 0 10px 30px color-mix(in srgb, #dc2626 30%, transparent);
    }
    .jogo-aviso--iso {
      background: linear-gradient(135deg, #84cc16, #4d7c0f);
      box-shadow: 0 10px 30px color-mix(in srgb, #84cc16 32%, transparent);
    }
    .jogo-aviso__ic { flex: 0 0 auto; display: inline-flex; }
    .jogo-aviso__txt { display: flex; flex-direction: column; min-width: 0; }
    .jogo-aviso__txt strong { font-weight: 800; }
    .jogo-aviso__txt span { font-size: 0.82rem; opacity: 0.92; }
    .jogo-aviso__seta { margin-left: auto; font-weight: 800; font-size: 1.2rem; }
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
  private readonly instApi = inject(InstituicaoApiService);
  private readonly worApi = inject(WorApiService);
  private readonly isolateusApi = inject(IsolateusApiService);
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
  protected readonly faltaDisciplinas = computed(
    () => !this.profileService.profile()?.disciplinas?.length,
  );

  /**
   * Acesso rápido: espelha o menu lateral (mesma fonte), menos o próprio
   * Dashboard, mais o atalho de **Meu Plano** (upsell) — este só na grid da home,
   * para reduzir o funil até a tela de assinatura sem poluir o menu lateral.
   */
  protected readonly atalhos = computed<NavLink[]>(() => [
    ...linksPainel(this.profileService.profile()?.planoAtual).filter(
      (l) => l.path !== '/dashboard',
    ),
    { label: 'Meu Plano', path: '/configuracoes/plano', icon: 'sparkles' },
  ]);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sessoes = signal<Sessao[]>([]);
  protected readonly turmas = signal<Map<string, Turma>>(new Map());
  protected readonly excecaoAberta = signal(false);
  protected readonly salvandoExcecao = signal(false);

  // Plano de aula: contexto geral por disciplina (Graduado+) e tópico da próxima aula (Mestre+).
  private readonly planos = signal<Map<string, string>>(new Map());
  protected readonly topicoProximo = signal<string | null>(null);
  /** Tópico (id) alocado à próxima aula — usado para casar os jogos por tópico. */
  private readonly topicoIdProximo = signal<string | null>(null);
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
      // Turmas regulares têm card próprio (linguagem de escola) — fora daqui.
      .filter((s) => !turmas.get(s.turmaId)?.ensinoRegular)
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

  // ===== Ensino regular: próxima entrada (linguagem de escola) =====
  private readonly instituicoes = signal<Instituicao[]>([]);

  /**
   * Próxima entrada do ensino regular: varre os próximos 14 dias cruzando a
   * grade da instituição com as alocações das turmas regulares e devolve o
   * horário/escola/série mais próximo que ainda não terminou.
   */
  protected readonly proximaRegular = computed<EntradaRegular | null>(() => {
    const agora = this.relogio();
    const insts = this.instituicoes();
    if (!insts.length) return null;
    const regulares = [...this.turmas().values()].filter(
      (t) => t.ensinoRegular && (t.gradeHoraria?.length ?? 0) > 0,
    );
    if (!regulares.length) return null;
    const instMap = new Map(insts.map((i) => [i.id, i]));
    const hoje = isoLocal(agora);
    const nowMin = agora.getHours() * 60 + agora.getMinutes();

    const candidatos: (EntradaRegular & { ordem: string })[] = [];
    for (let d = 0; d < 14; d++) {
      const iso = addDiasIso(hoje, d);
      const w = weekdayIso(iso);
      for (const t of regulares) {
        if (iso < t.dataInicio) continue;
        const inst = instMap.get(t.instituicaoId ?? '');
        if (!inst) continue;
        const gradeTurno = gradeDoTurno(inst, t.turno ?? null);
        for (const g of t.gradeHoraria ?? []) {
          if (g.diaSemana !== w) continue;
          const slot = gradeTurno.find(
            (s) => s.tipo === 'AULA' && s.periodo === g.periodo,
          );
          if (!slot) continue;
          if (d === 0 && horaEmMin(slot.horaFim) <= nowMin) continue;
          candidatos.push({
            data: iso,
            periodo: g.periodo,
            horaInicio: slot.horaInicio,
            horaFim: slot.horaFim,
            escola: inst.nome,
            serie: t.anoSerie || t.nome,
            turmaId: t.id,
            turmaNome: t.nome,
            cor: t.cor,
            turno: t.turno,
            aulaUnica: !!inst.aulaUnicaPorTurno,
            ordem: `${iso}T${slot.horaInicio}`,
          });
        }
      }
    }
    candidatos.sort((a, b) => a.ordem.localeCompare(b.ordem));
    return candidatos[0] ?? null;
  });

  /** Usa o card de escola quando a entrada regular é a mais próxima. */
  protected readonly usarRegular = computed<boolean>(() => {
    const r = this.proximaRegular();
    if (!r) return false;
    const p = this.proxima();
    if (!p) return true;
    const t = this.proximaTurma();
    const mod = `${p.data}T${t?.horaInicio || '23:59'}`;
    return `${r.data}T${r.horaInicio}` <= mod;
  });

  /** Abertura da mensagem: "Hoje à tarde" / "Amanhã de manhã" / "Sexta-feira à noite". */
  protected abreRegular(): string {
    const r = this.proximaRegular();
    if (!r) return '';
    const hoje = isoLocal(this.relogio());
    const quando =
      r.data === hoje
        ? 'Hoje'
        : r.data === addDiasIso(hoje, 1)
          ? 'Amanhã'
          : DIAS_SEMANA_DASH[weekdayIso(r.data)];
    const periodo = periodoDoDia(r.turno);
    return periodo ? `${quando} ${periodo}` : quando;
  }

  /** Jogos do professor (PhD): Qlick e Wor — avisos da próxima aula. */
  private readonly qlicks = signal<Qlick[]>([]);
  private readonly worJogos = signal<WorJogo[]>([]);
  private readonly isolateusJogos = signal<IsolateusJogo[]>([]);

  /**
   * Jogos (Qlick/Wor/Isolateus) da próxima aula. Regras ENH-001/002:
   * - pertence à turma se atribuído a ela **ou** se é um jogo só-disciplina
   *   cuja disciplina bate com a da turma;
   * - jogo COM tópico só aparece se for o tópico alocado à próxima aula;
   * - jogo SEM tópico só aparece se estiver **fixado na aula atual**
   *   (`numeroAula` = número da próxima aula) — senão fica oculto (anti-poluição).
   */
  protected readonly jogosProximaAula = computed<AvisoJogo[]>(() => {
    const t = this.proximaTurma();
    if (!t) return [];
    const topico = this.topicoIdProximo();
    const numeroProx = this.proxima()?.numero;

    const daTurma = (jogo: {
      turmaId?: string;
      turmaIds?: string[];
      disciplina?: string;
    }) =>
      jogo.turmaId === t.id ||
      (jogo.turmaIds ?? []).includes(t.id) ||
      (!!jogo.disciplina && !!t.disciplina && jogo.disciplina === t.disciplina);

    const visivel = (jogo: {
      turmaId?: string;
      turmaIds?: string[];
      disciplina?: string;
      topicoId?: string;
      numeroAula?: number;
    }) => {
      if (!daTurma(jogo)) return false;
      if (jogo.topicoId) return !!topico && jogo.topicoId === topico;
      return jogo.numeroAula != null && jogo.numeroAula === numeroProx;
    };

    const avisos: AvisoJogo[] = [];
    for (const q of this.qlicks()) {
      if (visivel(q)) {
        avisos.push({ tipo: 'Qlick', titulo: q.titulo, rota: '/jogos/qlick' });
      }
    }
    for (const j of this.worJogos()) {
      if (visivel(j)) {
        avisos.push({ tipo: 'Wor', titulo: j.nome, rota: '/jogos/wor' });
      }
    }
    for (const j of this.isolateusJogos()) {
      if (visivel(j)) {
        avisos.push({
          tipo: 'Isolateus',
          titulo: j.nome,
          rota: '/jogos/isolateus',
        });
      }
    }
    return avisos;
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
      instituicoes: this.instApi.getInstituicoes().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ home, sessoes, instituicoes }) => {
        this.perfilCarregado.set(true);
        this.turmas.set(new Map(home.turmas.map((t) => [t.id, t])));
        this.sessoes.set(sessoes);
        this.instituicoes.set(instituicoes);
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
          this.worApi.listarJogos().subscribe({
            next: (js) => this.worJogos.set(js),
            error: () => {},
          });
          this.isolateusApi.listarJogos().subscribe({
            next: (js) => this.isolateusJogos.set(js),
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
      // Sem tópico a resolver: zera para não filtrar jogos por um tópico antigo.
      this.topicoProximo.set(null);
      this.topicoIdProximo.set(null);
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
        this.topicoIdProximo.set(null);
        return;
      }
      this.topicoIdProximo.set(aloc.topicoId);
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
