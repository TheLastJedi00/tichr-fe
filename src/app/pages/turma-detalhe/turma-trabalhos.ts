import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  AtividadeProfessor,
  formatarPrazo,
  isoParaCampos,
  prazoParaIso,
  TRABALHO_REGRAS,
  TrabalhoApiService,
} from '../../core/trabalho-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

interface Formulario {
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  valorPontos: number;
}

/**
 * Aba "Trabalhos" do detalhe da turma (spec 038). Smart: lista as atividades
 * com os contadores de entrega, cria, edita e exclui.
 */
@Component({
  selector: 'app-turma-trabalhos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Card, Icon, Spinner],
  template: `
    @if (form(); as f) {
      <button type="button" class="voltar" (click)="cancelar()">← Todos os trabalhos</button>
      <app-card>
        <h3 class="tit">{{ editandoId() ? 'Editar trabalho' : 'Novo trabalho' }}</h3>
        <form class="form" (ngSubmit)="salvar()">
          <label class="campo">
            <span>Título</span>
            <input
              class="tichr-input"
              name="titulo"
              required
              [maxlength]="regras.TITULO_MAX"
              [ngModel]="f.titulo"
              (ngModelChange)="mudar({ titulo: $event })"
              placeholder="Ex.: Site pessoal em HTML e CSS"
            />
          </label>
          <label class="campo">
            <span>Descrição <small class="muted">(opcional)</small></span>
            <textarea
              class="tichr-input"
              name="descricao"
              rows="4"
              [maxlength]="regras.DESCRICAO_MAX"
              [ngModel]="f.descricao"
              (ngModelChange)="mudar({ descricao: $event })"
              placeholder="O que o aluno deve entregar"
            ></textarea>
          </label>
          <fieldset class="prazo">
            <legend>Prazo: data e hora limite</legend>
            <label class="campo">
              <span>Data</span>
              <input
                class="tichr-input"
                type="date"
                name="data"
                required
                [ngModel]="f.data"
                (ngModelChange)="mudar({ data: $event })"
              />
            </label>
            <label class="campo">
              <span>Hora limite</span>
              <input
                class="tichr-input"
                type="time"
                name="hora"
                required
                [ngModel]="f.hora"
                (ngModelChange)="mudar({ hora: $event })"
              />
            </label>
          </fieldset>
          <label class="campo campo--curto">
            <span>Vale quantos pontos</span>
            <input
              class="tichr-input"
              type="number"
              name="valor"
              min="0"
              [max]="regras.VALOR_MAX"
              step="1"
              [ngModel]="f.valorPontos"
              (ngModelChange)="mudar({ valorPontos: $event })"
            />
            <small class="muted">A nota de 0 a 10 vira pontos no ranking: nota 8 vale {{ exemplo() }}.</small>
          </label>
          @if (erroForm(); as e) {
            <p class="erro" role="alert">{{ e }}</p>
          }
          <div class="acoes">
            <button type="button" class="btn-outline" (click)="cancelar()">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="salvando()">
              {{ salvando() ? 'Salvando…' : editandoId() ? 'Salvar' : 'Criar trabalho' }}
            </button>
          </div>
        </form>
      </app-card>
    } @else {
      <div class="barra">
        <span class="muted">Os alunos entregam pelo portal até o prazo.</span>
        <button type="button" class="btn-primary" (click)="novo()">
          <app-icon name="plus" [size]="16" /> Novo trabalho
        </button>
      </div>

      @if (carregando()) {
        <div class="loading"><app-spinner [size]="28" /></div>
      } @else if (atividades().length === 0) {
        <app-card>
          <p class="muted">Nenhum trabalho ainda. Crie o primeiro para os alunos entregarem pelo portal.</p>
        </app-card>
      } @else {
        <ul class="lista">
          @for (a of atividades(); track a.id) {
            <li class="item" [class.item--avaliar]="a.aguardandoAvaliacao > 0">
              <div class="item__top">
                <strong class="item__tit">{{ a.titulo }}</strong>
                <span class="selo" [attr.data-tipo]="a.aberta ? 'aberto' : 'encerrado'">
                  {{ a.aberta ? 'Recebendo' : 'Encerrado' }}
                </span>
              </div>
              <span class="item__meta">
                <app-icon name="calendar" [size]="14" /> {{ prazo(a.prazo) }}
                · vale {{ a.valorPontos }} pontos
              </span>
              <span class="item__meta">
                <strong>{{ a.totalEntregas }}/{{ a.totalAlunos }}</strong> entregaram
                @if (a.aguardandoAvaliacao > 0) {
                  · <span class="avaliar">{{ a.aguardandoAvaliacao }} para avaliar</span>
                }
              </span>
              <div class="item__acoes">
                <button type="button" class="btn-outline" (click)="editar(a)">Editar</button>
                <button
                  type="button"
                  class="btn-outline"
                  [disabled]="a.totalEntregas > 0 || excluindo() === a.id"
                  [title]="a.totalEntregas > 0 ? 'Já tem entregas: altere o prazo para encerrar' : ''"
                  (click)="excluir(a)"
                >Excluir</button>
              </div>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    .barra { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .barra .btn-primary { display: inline-flex; align-items: center; gap: 0.35rem; }
    .loading { display: flex; justify-content: center; padding: 2rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0; }
    .tit { margin: 0 0 1rem; font-size: 1.15rem; font-weight: 800; }
    .form { display: flex; flex-direction: column; gap: 0.9rem; }
    .campo { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; }
    .campo textarea { resize: vertical; font-family: inherit; }
    .campo--curto { max-width: 22rem; }
    .campo small { font-weight: 400; }
    .prazo { display: flex; gap: 0.75rem; flex-wrap: wrap; border: 2px solid var(--border); border-radius: 12px; padding: 0.6rem 0.8rem 0.8rem; margin: 0; }
    .prazo legend { font-weight: 700; padding: 0 0.3rem; }
    .prazo .campo { flex: 1 1 10rem; }
    .erro { color: var(--danger); font-weight: 600; margin: 0; }
    .acoes { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.8rem 0.9rem;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
    }
    .item--avaliar { border-left: 6px solid var(--warning); }
    .item__top { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    .item__tit { overflow-wrap: anywhere; }
    .item__meta { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--text-muted); }
    .item__meta strong { color: var(--text); }
    .avaliar { color: var(--warning); font-weight: 700; }
    .item__acoes { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.2rem; }
    .item__acoes button { padding: 0.35rem 0.8rem; }
    .selo { font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; white-space: nowrap; }
    .selo[data-tipo='aberto'] { color: var(--success); border: 1px solid var(--success); }
    .selo[data-tipo='encerrado'] { color: var(--text-muted); border: 1px solid var(--border); }
    .voltar {
      display: inline-block;
      margin-bottom: 0.5rem;
      color: var(--text-muted);
      font-weight: 600;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      cursor: pointer;
    }
  `,
})
export class TurmaTrabalhos implements OnInit {
  private readonly api = inject(TrabalhoApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly turmaId = input.required<string>();
  /** Entregas esperando nota (badge da aba). */
  readonly pendentesMudou = output<number>();

  protected readonly regras = TRABALHO_REGRAS;
  protected readonly prazo = formatarPrazo;

  protected readonly carregando = signal(true);
  protected readonly atividades = signal<AtividadeProfessor[]>([]);
  protected readonly form = signal<Formulario | null>(null);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroForm = signal<string | null>(null);
  protected readonly excluindo = signal<string | null>(null);

  protected readonly exemplo = computed(() => {
    const v = Number(this.form()?.valorPontos) || 0;
    const p = Math.round(0.8 * v);
    return `${p} ${p === 1 ? 'ponto' : 'pontos'}`;
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected novo(): void {
    this.editandoId.set(null);
    this.erroForm.set(null);
    this.form.set({
      titulo: '',
      descricao: '',
      data: '',
      hora: '23:59',
      valorPontos: TRABALHO_REGRAS.VALOR_PADRAO,
    });
  }

  protected editar(a: AtividadeProfessor): void {
    const { data, hora } = isoParaCampos(a.prazo);
    this.editandoId.set(a.id);
    this.erroForm.set(null);
    this.form.set({
      titulo: a.titulo,
      descricao: a.descricao ?? '',
      data,
      hora,
      valorPontos: a.valorPontos,
    });
  }

  protected mudar(parte: Partial<Formulario>): void {
    const f = this.form();
    if (f) this.form.set({ ...f, ...parte });
  }

  protected cancelar(): void {
    this.form.set(null);
    this.editandoId.set(null);
    this.erroForm.set(null);
  }

  protected salvar(): void {
    const f = this.form();
    if (!f || this.salvando()) return;
    const titulo = f.titulo.trim();
    const prazo = prazoParaIso(f.data, f.hora);
    const valorPontos = Number(f.valorPontos);
    if (!titulo) return this.erroForm.set('Dê um título ao trabalho.');
    if (!prazo) return this.erroForm.set('Informe a data e a hora limite do prazo.');
    if (!this.editandoId() && Date.parse(prazo) <= Date.now()) {
      return this.erroForm.set('O prazo precisa ser depois de agora.');
    }
    if (!Number.isInteger(valorPontos) || valorPontos < 0 || valorPontos > TRABALHO_REGRAS.VALOR_MAX) {
      return this.erroForm.set(`O trabalho vale de 0 a ${TRABALHO_REGRAS.VALOR_MAX} pontos.`);
    }
    const dados = { titulo, descricao: f.descricao.trim() || null, prazo, valorPontos };
    const id = this.editandoId();
    const req = id
      ? this.api.editarAtividade(this.turmaId(), id, dados)
      : this.api.criarAtividade(this.turmaId(), dados);
    this.salvando.set(true);
    this.erroForm.set(null);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.salvando.set(false);
        this.cancelar();
        this.carregar();
      },
      error: () => this.salvando.set(false),
    });
  }

  protected excluir(a: AtividadeProfessor): void {
    if (a.totalEntregas > 0 || !confirm(`Excluir o trabalho "${a.titulo}"?`)) return;
    this.excluindo.set(a.id);
    this.api
      .excluirAtividade(this.turmaId(), a.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.excluindo.set(null);
          this.carregar();
        },
        error: () => {
          this.excluindo.set(null);
          this.carregar();
        },
      });
  }

  private carregar(): void {
    this.api
      .listarAtividades(this.turmaId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (l) => {
          this.atividades.set(l);
          this.carregando.set(false);
          this.pendentesMudou.emit(l.reduce((s, a) => s + a.aguardandoAvaliacao, 0));
        },
        error: () => this.carregando.set(false),
      });
  }
}
