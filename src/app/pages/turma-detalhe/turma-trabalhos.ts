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
import { formatarDataHora, tempoRelativo } from '../../core/date-format';
import { baixar, tamanhoLegivel } from '../../core/pergunta-api.service';
import {
  AtividadeProfessor,
  EntregaDoAluno,
  EntregaResumo,
  EntregasDaAtividade,
  EstadoEntrega,
  formatarNota,
  formatarPrazo,
  isoParaCampos,
  lerNota,
  pontosDaNota,
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
 * com os contadores de entrega, cria, edita e exclui; abre as entregas de
 * cada uma, lê o texto, baixa os arquivos e avalia (a nota vira pontos).
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
    } @else if (entrega(); as d) {
      <button type="button" class="voltar" (click)="fecharEntrega()">← Entregas de {{ d.atividade.titulo }}</button>
      <app-card>
        <div class="cab">
          <div>
            <h3 class="tit tit--sem">{{ d.aluno.nome }}</h3>
            <span class="muted">
              {{ d.atividade.titulo }}
              @if (d.entrega?.atualizadaEm; as at) { · entregue em {{ dataHora(at) }} }
            </span>
          </div>
          <span class="selo" [attr.data-tipo]="tipoSelo(d.estado)">{{ rotuloSelo(d.estado, d.entrega?.avaliacao?.nota ?? null) }}</span>
        </div>

        @if (!d.entrega || d.estado === 'PENDENTE' || d.estado === 'PERDIDA') {
          <p class="muted">{{ d.estado === 'PERDIDA' ? 'O prazo acabou e este aluno não entregou.' : 'Este aluno ainda não entregou.' }}</p>
        } @else {
          @if (d.entrega.texto) {
            <h4 class="sub">Texto</h4>
            <div class="canva" tabindex="0">{{ d.entrega.texto }}</div>
          }
          @if (d.entrega.arquivos.length > 0) {
            <h4 class="sub">Arquivos</h4>
            <ul class="chips">
              @for (arq of d.entrega.arquivos; track arq.id) {
                <li>
                  <button type="button" class="chip" [disabled]="baixando() === arq.id" (click)="baixarArquivo(d, arq.id)">
                    <app-icon name="paperclip" [size]="14" />
                    <span class="chip__nome">{{ arq.nome }}</span>
                    <span class="chip__tam">{{ tamanho(arq.tamanho) }}</span>
                    <span class="chip__acao"><app-icon name="download" [size]="14" /> {{ baixando() === arq.id ? 'Abrindo…' : 'Baixar' }}</span>
                  </button>
                </li>
              }
            </ul>
          }

          <form class="avaliacao" (ngSubmit)="avaliar(d)">
            <h4 class="sub">{{ d.entrega.avaliacao ? 'Reavaliar' : 'Avaliar' }}</h4>
            @if (d.entrega.avaliacao; as av) {
              <p class="muted">
                Nota atual {{ nota(av.nota) }} · {{ av.pontos }} {{ av.pontos === 1 ? 'ponto' : 'pontos' }} no ranking
                · avaliada {{ relativo(av.avaliadaEm) }}
              </p>
            }
            <div class="avaliacao__linha">
              <label class="campo campo--nota">
                <span>Nota (0 a 10)</span>
                <input
                  class="tichr-input"
                  name="nota"
                  inputmode="decimal"
                  [ngModel]="notaTexto()"
                  (ngModelChange)="notaTexto.set($event)"
                  placeholder="Ex.: 8,5"
                />
              </label>
              <span class="previa" aria-live="polite">{{ previa(d) }}</span>
            </div>
            <label class="campo">
              <span>Comentário para o aluno <small class="muted">(opcional)</small></span>
              <textarea
                class="tichr-input"
                name="comentario"
                rows="3"
                [maxlength]="regras.COMENTARIO_MAX"
                [ngModel]="comentario()"
                (ngModelChange)="comentario.set($event)"
              ></textarea>
            </label>
            <div class="acoes">
              <button type="submit" class="btn-primary" [disabled]="notaLida() === null || avaliando()">
                <app-icon name="check" [size]="16" />
                {{ avaliando() ? 'Salvando…' : d.entrega.avaliacao ? 'Reavaliar' : 'Avaliar' }}
              </button>
            </div>
          </form>
        }
      </app-card>
    } @else if (entregas(); as e) {
      <button type="button" class="voltar" (click)="fecharEntregas()">← Todos os trabalhos</button>
      <app-card>
        <div class="cab">
          <div>
            <h3 class="tit tit--sem">{{ e.atividade.titulo }}</h3>
            <span class="muted">
              Prazo {{ prazo(e.atividade.prazo) }} · {{ e.atividade.totalEntregas }}/{{ e.atividade.totalAlunos }} entregaram
              · vale {{ e.atividade.valorPontos }} pontos
            </span>
          </div>
          <span class="selo" [attr.data-tipo]="e.atividade.aberta ? 'aberto' : 'encerrado'">
            {{ e.atividade.aberta ? 'Recebendo' : 'Encerrado' }}
          </span>
        </div>
        @if (e.atividade.descricao) {
          <p class="descricao">{{ e.atividade.descricao }}</p>
        }
        @if (e.alunos.length === 0) {
          <p class="muted">A turma ainda não tem alunos.</p>
        } @else {
          <ul class="alunos">
            @for (al of e.alunos; track al.alunoId) {
              <li>
                <button
                  type="button"
                  class="aluno"
                  [class.aluno--avaliar]="al.estado === 'ENTREGUE'"
                  [disabled]="al.estado === 'PENDENTE' || al.estado === 'PERDIDA'"
                  (click)="abrirEntrega(e.atividade.id, al)"
                >
                  <span class="aluno__nome">{{ al.alunoNome }}</span>
                  <span class="aluno__meta">
                    @if (al.temTexto) { <span>texto</span> }
                    @if (al.totalArquivos > 0) {
                      <span><app-icon name="paperclip" [size]="12" /> {{ al.totalArquivos }}</span>
                    }
                    @if (al.atualizadaEm) {
                      <time [attr.datetime]="al.atualizadaEm" [title]="dataHora(al.atualizadaEm)">{{ relativo(al.atualizadaEm) }}</time>
                    }
                  </span>
                  <span class="selo" [attr.data-tipo]="tipoSelo(al.estado)">{{ rotuloSelo(al.estado, al.nota) }}</span>
                </button>
              </li>
            }
          </ul>
        }
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
                <button type="button" class="btn-primary" (click)="abrirEntregas(a.id)">Ver entregas</button>
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
    .selo[data-tipo='encerrado'],
    .selo[data-tipo='pendente'],
    .selo[data-tipo='perdida'] { color: var(--text-muted); border: 1px solid var(--border); }
    .selo[data-tipo='avaliar'] { color: var(--warning); border: 1px solid var(--warning); }
    .selo[data-tipo='avaliada'] { color: var(--success); border: 1px solid var(--success); }
    .tit--sem { margin: 0 0 0.2rem; }
    .cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .descricao { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0 0 1rem; }
    .sub { margin: 1rem 0 0.4rem; font-size: 0.95rem; font-weight: 800; }
    .canva {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-height: 26rem;
      overflow-y: auto;
      padding: 0.8rem 0.9rem;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--bg);
      line-height: 1.5;
    }
    .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
      padding: 0.45rem 0.7rem;
      border: 2px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .chip:hover:not(:disabled) { border-color: var(--primary); }
    .chip__nome { font-weight: 700; overflow-wrap: anywhere; }
    .chip__tam { color: var(--text-muted); }
    .chip__acao { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--primary); font-weight: 700; }
    .avaliacao { display: flex; flex-direction: column; gap: 0.6rem; border-top: 2px solid var(--border); margin-top: 1.2rem; padding-top: 0.2rem; }
    .avaliacao__linha { display: flex; align-items: flex-end; gap: 0.9rem; flex-wrap: wrap; }
    .campo--nota { max-width: 10rem; }
    .previa { font-weight: 700; color: var(--primary); padding-bottom: 0.6rem; }
    .avaliacao .btn-primary { display: inline-flex; align-items: center; gap: 0.35rem; }
    .alunos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .aluno {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.8rem;
      border: 2px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .aluno:hover:not(:disabled) { border-color: var(--primary); }
    .aluno:disabled { cursor: default; opacity: 0.75; }
    .aluno--avaliar { border-left: 6px solid var(--warning); }
    .aluno__nome { font-weight: 700; overflow-wrap: anywhere; }
    .aluno__meta { display: inline-flex; gap: 0.5rem; align-items: center; font-size: 0.8rem; color: var(--text-muted); }
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

  readonly pontuacaoAtiva = input(true);

  protected readonly regras = TRABALHO_REGRAS;
  protected readonly prazo = formatarPrazo;
  protected readonly dataHora = formatarDataHora;
  protected readonly relativo = tempoRelativo;
  protected readonly tamanho = tamanhoLegivel;
  protected readonly nota = formatarNota;

  protected readonly entregas = signal<EntregasDaAtividade | null>(null);
  protected readonly entrega = signal<EntregaDoAluno | null>(null);
  protected readonly notaTexto = signal('');
  protected readonly comentario = signal('');
  protected readonly avaliando = signal(false);
  protected readonly baixando = signal<string | null>(null);
  protected readonly notaLida = computed(() => lerNota(this.notaTexto()));

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

  // ===== Entregas e avaliação (038 #14–#18) =====

  protected abrirEntregas(atividadeId: string): void {
    this.api
      .entregas(this.turmaId(), atividadeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (e) => this.entregas.set(e) });
  }

  protected fecharEntregas(): void {
    this.entregas.set(null);
    this.carregar();
  }

  protected abrirEntrega(atividadeId: string, al: EntregaResumo): void {
    this.api
      .entregaDoAluno(this.turmaId(), atividadeId, al.alunoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          const av = d.entrega?.avaliacao;
          this.notaTexto.set(av ? formatarNota(av.nota) : '');
          this.comentario.set(av?.comentario ?? '');
          this.entrega.set(d);
        },
      });
  }

  protected fecharEntrega(): void {
    const d = this.entrega();
    this.entrega.set(null);
    if (d) this.abrirEntregas(d.atividade.id);
  }

  /** "Vale +80 pontos"; na reavaliação, a diferença. */
  protected previa(d: EntregaDoAluno): string {
    const n = this.notaLida();
    if (this.notaTexto().trim() && n === null) return 'Nota de 0 a 10, com até uma casa.';
    if (n === null) return '';
    if (!this.pontuacaoAtiva()) return 'A pontuação desta turma está desligada: fica só a nota.';
    const alvo = pontosDaNota(n, d.atividade.valorPontos);
    if (!d.entrega?.avaliacao) return `Vale +${alvo} ${alvo === 1 ? 'ponto' : 'pontos'}`;
    const dif = alvo - d.entrega.avaliacao.pontos;
    if (dif === 0) return 'Mesma pontuação';
    return `${dif > 0 ? '+' : ''}${dif} ${Math.abs(dif) === 1 ? 'ponto' : 'pontos'} em relação à nota atual`;
  }

  protected avaliar(d: EntregaDoAluno): void {
    const nota = this.notaLida();
    if (nota === null || this.avaliando()) return;
    this.avaliando.set(true);
    this.api
      .avaliar(this.turmaId(), d.atividade.id, d.aluno.id, {
        nota,
        comentario: this.comentario().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entrega) => {
          this.avaliando.set(false);
          this.entrega.set({ ...d, estado: entrega.estado, entrega });
          this.atualizarPendentes();
        },
        error: () => this.avaliando.set(false),
      });
  }

  protected baixarArquivo(d: EntregaDoAluno, arquivoId: string): void {
    this.baixando.set(arquivoId);
    this.api
      .arquivoDoProfessor(this.turmaId(), d.atividade.id, d.aluno.id, arquivoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          this.baixando.set(null);
          baixar(url);
        },
        error: () => this.baixando.set(null),
      });
  }

  protected tipoSelo(estado: EstadoEntrega): string {
    const tipos: Record<EstadoEntrega, string> = {
      ENTREGUE: 'avaliar',
      AVALIADA: 'avaliada',
      PENDENTE: 'pendente',
      PERDIDA: 'perdida',
    };
    return tipos[estado];
  }

  protected rotuloSelo(estado: EstadoEntrega, nota: number | null): string {
    switch (estado) {
      case 'ENTREGUE':
        return 'Para avaliar';
      case 'AVALIADA':
        return nota === null ? 'Avaliada' : `Avaliada · ${formatarNota(nota)}`;
      case 'PENDENTE':
        return 'Pendente';
      default:
        return 'Não entregou';
    }
  }

  private atualizarPendentes(): void {
    this.api
      .pendentes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => this.pendentesMudou.emit(p[this.turmaId()] ?? 0) });
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
