import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { Alocacao, PlanoAula, Sessao, Topico, Turma } from '../../core/models';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Plano de Aula (Graduado): escopo geral por disciplina + backlog de tópicos e
 * quadro de alocação (drag & drop) na grade da turma — tudo no mesmo plano.
 */
@Component({
  selector: 'app-plano-aula-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Card,
    Icon,
    Spinner,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
  ],
  template: `
    <h1 class="title">Plano de Aula</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (disciplinas().length === 0) {
      <app-card>
        <p class="muted">
          Cadastre suas <strong>disciplinas</strong> em
          <a routerLink="/configuracoes">Configurações</a> para montar o plano de aula.
        </p>
      </app-card>
    } @else {
      <app-card>
        <label class="campo">
          <span>Disciplina</span>
          <select
            class="tichr-input"
            [value]="disciplinaSel()"
            (change)="selecionar($any($event.target).value)"
          >
            @for (d of disciplinas(); track d) {
              <option [value]="d">{{ d }}</option>
            }
          </select>
        </label>

        <label class="campo">
          <span>Contexto geral (objetivos, ementa, bibliografia)</span>
          <textarea
            class="tichr-input"
            rows="8"
            placeholder="Descreva o escopo macro da disciplina…"
            [value]="contexto()"
            (input)="contexto.set($any($event.target).value)"
          ></textarea>
        </label>

        @if (salvo()) { <p class="ok"><app-icon name="check" [size]="15" /> Plano de aula salvo!</p> }
        <button class="btn-primary full" type="button" [disabled]="salvando()" (click)="salvar()">
          {{ salvando() ? 'Salvando…' : 'Salvar' }}
        </button>
      </app-card>

      @if (podeModular()) {
        <div cdkDropListGroup class="micro">
          <app-card>
            <h2 class="sub">Tópicos da disciplina</h2>
            <form class="add" (submit)="$event.preventDefault(); adicionarTopico()">
              <input
                class="tichr-input"
                placeholder="Tópicos separados por vírgula (ex: Tags HTML, Atributos)"
                [value]="entradaTopico()"
                (input)="entradaTopico.set($any($event.target).value)"
              />
              <button class="btn-outline" type="submit" [disabled]="salvandoTopico()">
                Adicionar
              </button>
            </form>

            <div
              class="backlog"
              cdkDropList
              [cdkDropListData]="topicos()"
              [cdkDropListConnectedTo]="[]"
            >
              @for (t of topicos(); track t.id) {
                <div class="topico" cdkDrag [cdkDragData]="t">
                  <app-icon name="grip" [size]="14" />
                  <span class="topico__nome">{{ t.nome }}</span>
                  <button class="x" type="button" (click)="removerTopico(t)" aria-label="Remover">
                    <app-icon name="close" [size]="14" />
                  </button>
                </div>
              } @empty {
                <p class="hint">Cadastre tópicos e arraste-os para as aulas.</p>
              }
            </div>
          </app-card>

          <app-card>
            <h2 class="sub">Alocar na turma</h2>
            @if (turmasDaDisciplina().length === 0) {
              <p class="hint">Nenhuma turma com esta disciplina.</p>
            } @else {
              <label class="campo">
                <span>Turma</span>
                <select
                  class="tichr-input"
                  [value]="turmaSel()"
                  (change)="selecionarTurma($any($event.target).value)"
                >
                  @for (t of turmasDaDisciplina(); track t.id) {
                    <option [value]="t.id">{{ t.nome }}</option>
                  }
                </select>
              </label>

              <div class="aulas">
                @for (s of sessoesTurma(); track s.id) {
                  <div
                    class="aula"
                    cdkDropList
                    [cdkDropListData]="s.numero"
                    (cdkDropListDropped)="soltar($event, s.numero)"
                  >
                    <span class="aula__n">Aula {{ s.numero }}</span>
                    <span class="aula__d">{{ formatarData(s.data) }}</span>
                    @if (topicoDaAula(s.numero); as nome) {
                      <span class="aula__topico">
                        {{ nome }}
                        <button class="x" type="button" (click)="desalocar(s.numero)" aria-label="Remover">
                          <app-icon name="close" [size]="13" />
                        </button>
                      </span>
                    } @else {
                      <span class="aula__vazio">Solte um tópico</span>
                    }
                  </div>
                } @empty {
                  <p class="hint">Sem aulas projetadas nesta turma.</p>
                }
              </div>
            }
          </app-card>
        </div>
      }
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .sub { margin: 0 0 0.75rem; font-size: 1.1rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .campo { display: block; margin-bottom: 1rem; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    textarea.tichr-input { resize: vertical; }
    .muted { color: var(--text-muted); margin: 0; }
    .hint { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0; }
    .ok { color: var(--success); font-weight: 600; margin: 0 0 0.75rem; }
    .full { width: 100%; }
    .add { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .add .tichr-input { flex: 1 1 240px; }
    .micro { margin-top: 1rem; display: grid; gap: 1rem; }
    @media (min-width: 800px) { .micro { grid-template-columns: 300px 1fr; align-items: start; } }

    .backlog { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 2.5rem; }
    .topico {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0.35rem 0.6rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--surface); cursor: grab;
    }
    .topico:active { cursor: grabbing; }
    .topico__nome { font-weight: 600; font-size: 0.85rem; }

    .aulas { display: flex; flex-direction: column; gap: 0.4rem; }
    .aula {
      display: flex; align-items: center; gap: 0.35rem 0.6rem; flex-wrap: wrap;
      padding: 0.55rem 0.7rem; border: 1px dashed var(--border);
      border-radius: var(--radius); background: var(--surface-alt);
    }
    .aula__n { font-weight: 700; flex: 0 0 auto; }
    .aula__d { color: var(--text-muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
    .aula__vazio { margin-left: auto; color: var(--text-muted); font-size: 0.8rem; }
    .aula__topico {
      margin-left: auto; display: inline-flex; align-items: center; gap: 0.3rem;
      max-width: 100%; overflow-wrap: anywhere;
      padding: 0.2rem 0.55rem; border-radius: 12px; font-weight: 600; font-size: 0.82rem;
      color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .x { display: inline-flex; border: none; background: none; color: inherit; cursor: pointer; padding: 0; }
    .cdk-drag-preview {
      display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.6rem;
      border-radius: 999px; border: 1px solid var(--primary); background: var(--surface);
      box-shadow: 4px 4px 0 var(--border);
    }
    .cdk-drop-list-receiving { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
    @media (prefers-reduced-motion: reduce) { .cdk-drag { transition: none !important; } }
  `,
})
export class PlanoAulaPage {
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);
  protected readonly formatarData = formatarData;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly disciplinaSel = signal('');
  protected readonly contexto = signal('');
  private readonly planos = signal<PlanoAula[]>([]);

  // Graduado: tópicos + alocação (quadro modular).
  protected readonly topicos = signal<Topico[]>([]);
  protected readonly entradaTopico = signal('');
  protected readonly salvandoTopico = signal(false);
  protected readonly turmaSel = signal('');
  private readonly turmas = signal<Turma[]>([]);
  private readonly sessoes = signal<Sessao[]>([]);
  private readonly alocacoes = signal<Alocacao[]>([]);

  protected readonly disciplinas = computed(
    () => this.profileService.profile()?.disciplinas ?? [],
  );
  /** Quadro modular (tópicos + alocação): liberado já no plano Graduado. */
  protected readonly podeModular = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'GRADUADO'),
  );
  protected readonly turmasDaDisciplina = computed(() =>
    this.turmas().filter((t) => t.disciplina === this.disciplinaSel()),
  );
  protected readonly sessoesTurma = computed(() =>
    this.sessoes()
      .filter((s) => s.turmaId === this.turmaSel())
      .sort((a, b) => a.numero - b.numero),
  );

  /** Nome do tópico alocado a uma aula (por número), se houver. */
  protected topicoDaAula(numero: number): string | null {
    const aloc = this.alocacoes().find((a) => a.numeroAula === numero);
    if (!aloc) return null;
    return this.topicos().find((t) => t.id === aloc.topicoId)?.nome ?? null;
  }

  constructor() {
    const iniciar = () => {
      const primeira = this.disciplinas()[0] ?? '';
      this.api.getPlanosAula().subscribe((p) => {
        this.planos.set(p);
        this.selecionar(primeira);
        this.carregando.set(false);
      });
      if (this.podeModular()) {
        this.api.getTurmas().subscribe((t) => this.turmas.set(t));
        this.api.getSessoesSemana().subscribe((s) => this.sessoes.set(s));
      }
    };
    if (this.profileService.profile()) {
      iniciar();
    } else {
      this.profileService.load().subscribe({
        next: iniciar,
        error: () => this.carregando.set(false),
      });
    }
  }

  protected selecionar(disciplina: string): void {
    this.disciplinaSel.set(disciplina);
    this.salvo.set(false);
    this.contexto.set(
      this.planos().find((p) => p.disciplina === disciplina)?.contextoGeral ?? '',
    );
    if (this.podeModular() && disciplina) {
      this.api.getTopicos(disciplina).subscribe((t) => this.topicos.set(t));
      const turma = this.turmasDaDisciplina()[0];
      this.selecionarTurma(turma?.id ?? '');
    }
  }

  protected selecionarTurma(turmaId: string): void {
    this.turmaSel.set(turmaId);
    if (turmaId) {
      this.api.getAlocacoes(turmaId).subscribe((a) => this.alocacoes.set(a));
    } else {
      this.alocacoes.set([]);
    }
  }

  protected salvar(): void {
    const disciplina = this.disciplinaSel();
    if (!disciplina) return;
    this.salvando.set(true);
    this.salvo.set(false);
    this.api.salvarPlanoAula(disciplina, this.contexto()).subscribe({
      next: (plano) => {
        this.planos.update((atual) => [
          ...atual.filter((p) => p.disciplina !== plano.disciplina),
          plano,
        ]);
        this.salvando.set(false);
        this.salvo.set(true);
      },
      error: () => this.salvando.set(false),
    });
  }

  // ===== Tópicos =====

  protected adicionarTopico(): void {
    const nomes = this.entradaTopico()
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (nomes.length === 0) return;
    this.salvandoTopico.set(true);
    this.api.adicionarTopicos(this.disciplinaSel(), nomes).subscribe({
      next: (novos) => {
        this.topicos.update((atual) => [...atual, ...novos]);
        this.entradaTopico.set('');
        this.salvandoTopico.set(false);
      },
      error: () => this.salvandoTopico.set(false),
    });
  }

  protected removerTopico(topico: Topico): void {
    this.api.removerTopico(topico.id).subscribe(() => {
      this.topicos.update((atual) => atual.filter((t) => t.id !== topico.id));
      this.alocacoes.update((atual) =>
        atual.filter((a) => a.topicoId !== topico.id),
      );
    });
  }

  // ===== Alocação (drag & drop) =====

  protected soltar(event: CdkDragDrop<number>, numero: number): void {
    const topico = event.item.data as Topico;
    if (topico?.id) {
      this.aplicarAlocacao(numero, topico.id);
    }
  }

  protected desalocar(numero: number): void {
    this.aplicarAlocacao(numero, null);
  }

  /** Persiste a alocação de forma otimista, com rollback em erro. */
  private aplicarAlocacao(numero: number, topicoId: string | null): void {
    const turmaId = this.turmaSel();
    const anterior = this.alocacoes();
    this.alocacoes.update((atual) => {
      const semAula = atual.filter((a) => a.numeroAula !== numero);
      return topicoId
        ? [...semAula, { id: `tmp-${numero}`, turmaId, numeroAula: numero, topicoId }]
        : semAula;
    });
    this.api.definirAlocacao(turmaId, numero, topicoId).subscribe({
      next: () => this.api.getAlocacoes(turmaId).subscribe((a) => this.alocacoes.set(a)),
      error: () => this.alocacoes.set(anterior),
    });
  }
}
