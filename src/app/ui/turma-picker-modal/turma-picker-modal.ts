import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Turma } from '../../core/models';
import { turmaContaComoAtiva } from '../../core/plano.util';
import { TurmaPickerState } from '../../core/turma-picker.state';
import { Icon } from '../icon/icon';

/**
 * Seletor de turma em modal com busca + filtros (spec "UX de jogos"). Centralizado
 * no desktop e **bottom-sheet** no mobile. A busca tem debounce; disciplina e
 * status (ativas/todas) são filtros cumulativos; cada card mostra nome, disciplina
 * e nº de alunos. Os filtros vivem no {@link TurmaPickerState} (memória de sessão).
 * Componente de apresentação: quem persiste a escolha é o pai (via `selecionar`).
 */
@Component({
  selector: 'app-turma-picker-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (aberto()) {
      <div class="overlay" (click)="fechar.emit()">
        <div
          class="sheet"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <header class="sheet__head">
            <h2>Selecionar turma</h2>
            <button class="x" type="button" (click)="fechar.emit()" aria-label="Fechar">
              <app-icon name="close" [size]="20" />
            </button>
          </header>

          <div class="busca">
            <app-icon name="building" [size]="16" />
            <input
              #buscaInput
              class="tichr-input"
              type="text"
              placeholder="Buscar turma pelo nome…"
              [value]="estado.busca()"
              (input)="onBusca($any($event.target).value)"
            />
          </div>

          <div class="filtros">
            <label class="filtro">
              <span>Disciplina</span>
              <select
                class="tichr-input"
                [value]="estado.disciplina()"
                (change)="estado.disciplina.set($any($event.target).value)"
              >
                <option value="">Todas</option>
                @for (d of disciplinas(); track d) {
                  <option [value]="d">{{ d }}</option>
                }
              </select>
            </label>
            <label class="check">
              <input
                type="checkbox"
                [checked]="estado.status() === 'todas'"
                (change)="estado.status.set($any($event.target).checked ? 'todas' : 'ativas')"
              />
              Mostrar encerradas
            </label>
          </div>

          <div class="lista">
            @for (t of filtradas(); track t.id) {
              <button class="card" type="button" (click)="escolher(t)">
                <span class="dot" [style.background]="t.cor || 'var(--primary)'"></span>
                <span class="card__info">
                  <strong>{{ t.nome }}</strong>
                  <small>
                    {{ t.disciplina || 'Sem disciplina' }} · {{ contagemLabel(t.id) }}
                  </small>
                </span>
                @if (selecionadas.includes(t.id)) {
                  <app-icon class="ok" name="check" [size]="18" />
                }
              </button>
            } @empty {
              <p class="vazio">Nenhuma turma encontrada com esses filtros.</p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      z-index: 60;
      align-items: flex-end;
      justify-content: center;
    }
    @media (min-width: 640px) {
      .overlay { align-items: center; padding: 1rem; }
    }
    .sheet {
      background: var(--surface);
      border: 1px solid var(--border);
      width: 100%;
      max-width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      border-radius: 18px 18px 0 0;
      padding: 1rem;
      gap: 0.75rem;
    }
    @media (min-width: 640px) {
      .sheet { max-width: 460px; border-radius: 16px; max-height: 80vh; }
    }
    .sheet__head { display: flex; align-items: center; justify-content: space-between; }
    .sheet__head h2 { margin: 0; font-size: 1.15rem; }
    .x { background: none; border: 0; color: var(--text-muted); cursor: pointer; display: inline-flex; }
    .busca { display: flex; align-items: center; gap: 0.5rem; }
    .busca .tichr-input { flex: 1; }
    .filtros { display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
    .filtro { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; color: var(--text-muted); }
    .filtro .tichr-input { min-width: 9rem; }
    .check { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
    .lista { overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; }
    .card {
      display: flex; align-items: center; gap: 0.6rem; text-align: left;
      font: inherit; cursor: pointer; width: 100%;
      padding: 0.7rem 0.8rem; border-radius: 12px;
      border: 1px solid var(--border); background: var(--surface); color: inherit;
    }
    .card:hover { border-color: var(--primary); }
    .dot { width: 12px; height: 12px; border-radius: 999px; flex: 0 0 auto; }
    .card__info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .card__info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .card__info small { color: var(--text-muted); }
    .ok { color: var(--primary); }
    .vazio { color: var(--text-muted); text-align: center; padding: 1.5rem 0; margin: 0; }
  `,
})
export class TurmaPickerModal {
  protected readonly estado = inject(TurmaPickerState);

  @ViewChild('buscaInput') private buscaInput?: ElementRef<HTMLInputElement>;

  @Input() set open(v: boolean) {
    this.aberto.set(v);
    if (v) this.aoAbrir();
  }
  @Input() set turmas(v: Turma[]) {
    this._turmas.set(v ?? []);
  }
  /** Ids já selecionados (marcados com ✓ na lista). */
  @Input() selecionadas: string[] = [];

  @Output() selecionar = new EventEmitter<Turma>();
  @Output() fechar = new EventEmitter<void>();

  protected readonly aberto = signal(false);
  private readonly _turmas = signal<Turma[]>([]);
  /** Termo já "assentado" pelo debounce (o filtro reage a este, não à digitação). */
  private readonly termoAplicado = signal('');
  private debounce?: ReturnType<typeof setTimeout>;

  protected readonly disciplinas = computed(() =>
    [
      ...new Set(
        this._turmas()
          .map((t) => t.disciplina)
          .filter((d): d is string => !!d),
      ),
    ].sort(),
  );

  protected readonly filtradas = computed<Turma[]>(() => {
    const termo = this.termoAplicado().trim().toLowerCase();
    const disc = this.estado.disciplina();
    const soAtivas = this.estado.status() === 'ativas';
    return this._turmas().filter((t) => {
      if (soAtivas && !turmaContaComoAtiva(t)) return false;
      if (disc && t.disciplina !== disc) return false;
      if (termo && !t.nome.toLowerCase().includes(termo)) return false;
      return true;
    });
  });

  protected onBusca(valor: string): void {
    this.estado.busca.set(valor);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.termoAplicado.set(valor), 220);
  }

  protected contagemLabel(turmaId: string): string {
    const n = this.estado.contagem(turmaId);
    if (n === undefined) return '…';
    return `${n} aluno${n === 1 ? '' : 's'}`;
  }

  protected escolher(t: Turma): void {
    this.selecionar.emit(t);
  }

  private aoAbrir(): void {
    // Recupera o termo da sessão e carrega as contagens que faltam.
    this.termoAplicado.set(this.estado.busca());
    this.estado.garantirContagens(this._turmas());
    // Autofocus no desktop (no mobile evita subir o teclado à toa).
    if (window.matchMedia('(min-width: 640px)').matches) {
      setTimeout(() => this.buscaInput?.nativeElement.focus(), 0);
    }
  }
}
