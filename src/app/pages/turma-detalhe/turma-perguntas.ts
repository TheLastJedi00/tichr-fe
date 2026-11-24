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
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { formatarDataHora, formatarHora, tempoRelativo } from '../../core/date-format';
import {
  baixar,
  DetalhePergunta,
  EstadoJanelaPerguntas,
  PERGUNTA_REGRAS,
  PerguntaApiService,
  PerguntaProfessor,
  StatusPergunta,
} from '../../core/pergunta-api.service';
import { Card } from '../../ui/card/card';
import { ConversaPergunta } from '../../ui/conversa-pergunta/conversa-pergunta';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

type Filtro = 'ABERTA' | 'ENCERRADA' | 'TODAS';

/**
 * Aba "Perguntas" do detalhe da turma (spec 037). Smart: lista as perguntas
 * dos alunos (esperando o professor primeiro), abre a conversa, responde,
 * baixa anexos e encerra/reabre. A janela (abrir/fechar o recebimento) é do
 * pai, que também a mostra no cabeçalho.
 */
@Component({
  selector: 'app-turma-perguntas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Card, ConversaPergunta, Icon, Spinner],
  template: `
    @if (janela(); as j) {
      <div class="barra">
        <span class="barra__estado" [class.barra__estado--on]="j.abertas">
          <app-icon [name]="j.abertas ? 'chat' : 'lock'" [size]="16" />
          @if (j.abertas) {
            Abertas: os alunos podem perguntar
            @if (j.desde) { <span class="barra__desde">desde {{ hora(j.desde) }}</span> }
          } @else {
            Fechadas: os alunos só leem as respostas
          }
        </span>
        <button
          type="button"
          [class]="j.abertas ? 'btn-outline' : 'btn-primary'"
          [disabled]="alternandoJanela()"
          (click)="alternarJanela.emit()"
        >
          {{ j.abertas ? 'Fechar perguntas' : 'Abrir perguntas' }}
        </button>
      </div>
    }

    @if (aberta(); as d) {
      <button type="button" class="voltar" (click)="fecharConversa()">← Todas as perguntas</button>
      <app-card>
        <div class="conversa__top">
          <div>
            <h3 class="conversa__tit">{{ d.pergunta.titulo }}</h3>
            <span class="muted">
              {{ d.pergunta.alunoNome }} · aberta em {{ dataHora(d.pergunta.criadaEm) }}
              @if (d.pergunta.status === 'ENCERRADA') {
                · encerrada{{ d.pergunta.encerradaPor === 'ALUNO' ? ' pelo aluno' : '' }}
              }
            </span>
          </div>
          @if (d.pergunta.status === 'ABERTA') {
            <button type="button" class="btn-outline" [disabled]="ocupado()" (click)="encerrar(d.pergunta.id)">
              <app-icon name="check" [size]="16" /> Encerrar
            </button>
          } @else {
            <button type="button" class="btn-outline" [disabled]="ocupado()" (click)="reabrir(d.pergunta.id)">
              Reabrir
            </button>
          }
        </div>

        <app-conversa-pergunta
          [mensagens]="d.mensagens"
          eu="PROFESSOR"
          [nomeAluno]="d.pergunta.alunoNome"
          [baixando]="baixando()"
          (baixar)="baixarAnexo(d.pergunta.id, $event)"
        />

        @if (d.pergunta.status === 'ABERTA') {
          <form class="resposta" (ngSubmit)="responder(d.pergunta.id)">
            <textarea
              class="tichr-input"
              name="resposta"
              rows="3"
              [maxlength]="regras.TEXTO_MAX"
              [ngModel]="texto()"
              (ngModelChange)="texto.set($event)"
              placeholder="Responda ao aluno"
            ></textarea>
            <button type="submit" class="btn-primary" [disabled]="!texto().trim() || ocupado()">
              <app-icon name="send" [size]="16" /> {{ ocupado() ? 'Enviando…' : 'Responder' }}
            </button>
          </form>
        } @else {
          <p class="muted fechada"><app-icon name="lock" [size]="16" /> Conversa encerrada. Reabra para responder.</p>
        }
      </app-card>
    } @else {
      <div class="filtros" role="tablist" aria-label="Filtrar perguntas">
        @for (f of filtros; track f.valor) {
          <button
            type="button"
            role="tab"
            class="filtro"
            [class.filtro--on]="filtro() === f.valor"
            [attr.aria-selected]="filtro() === f.valor"
            (click)="mudarFiltro(f.valor)"
          >{{ f.rotulo }}</button>
        }
      </div>

      @if (carregando()) {
        <div class="loading"><app-spinner [size]="28" /></div>
      } @else if (perguntas().length === 0) {
        <app-card>
          <p class="muted">
            {{ filtro() === 'ENCERRADA' ? 'Nenhuma pergunta encerrada.' : 'Nenhuma pergunta por aqui.' }}
          </p>
        </app-card>
      } @else {
        <ul class="lista">
          @for (p of perguntas(); track p.id) {
            <li>
              <button type="button" class="item" [class.item--espera]="p.aguardando === 'AGUARDANDO_PROFESSOR'" (click)="abrir(p.id)">
                <span class="item__top">
                  <strong class="item__tit">{{ p.titulo }}</strong>
                  <span class="selo" [attr.data-tipo]="tipoSelo(p)">{{ rotuloSelo(p) }}</span>
                </span>
                <span class="item__meta">
                  <strong>{{ p.alunoNome }}</strong>
                  @if (p.temAnexo) { <app-icon name="paperclip" [size]="14" /> }
                  · {{ p.totalMensagens }} {{ p.totalMensagens === 1 ? 'mensagem' : 'mensagens' }}
                  · <time [attr.datetime]="p.atualizadaEm" [title]="dataHora(p.atualizadaEm)">{{ relativo(p.atualizadaEm) }}</time>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    .barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .barra__estado { display: inline-flex; align-items: center; gap: 0.45rem; font-weight: 700; color: var(--text-muted); }
    .barra__estado--on { color: var(--success); }
    .barra__desde { font-weight: 600; color: var(--text-muted); }
    .loading { display: flex; justify-content: center; padding: 2rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0; }
    .filtros { display: flex; gap: 0.4rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .filtro {
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      border: 2px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .filtro--on { border-color: var(--primary); background: var(--primary); color: var(--primary-contrast, #fff); }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .item {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.8rem 0.9rem;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .item:hover { border-color: var(--primary); }
    .item--espera { border-left: 6px solid var(--warning); }
    .item__top { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    .item__tit { overflow-wrap: anywhere; }
    .item__meta { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--text-muted); }
    .item__meta strong { color: var(--text); }
    .selo { font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; white-space: nowrap; }
    .selo[data-tipo='espera'] { color: var(--warning); border: 1px solid var(--warning); }
    .selo[data-tipo='respondida'] { color: var(--success); border: 1px solid var(--success); }
    .selo[data-tipo='encerrada'] { color: var(--text-muted); border: 1px solid var(--border); }
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
    .conversa__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .conversa__top .btn-outline { display: inline-flex; align-items: center; gap: 0.35rem; }
    .conversa__tit { margin: 0 0 0.2rem; font-size: 1.15rem; font-weight: 800; overflow-wrap: anywhere; }
    .resposta { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
    .resposta textarea { resize: vertical; min-height: 80px; font-family: inherit; }
    .resposta .btn-primary { align-self: flex-end; display: inline-flex; align-items: center; gap: 0.4rem; }
    .fechada { display: flex; align-items: center; gap: 0.4rem; margin-top: 1rem; }
  `,
})
export class TurmaPerguntas implements OnInit {
  private readonly api = inject(PerguntaApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly turmaId = input.required<string>();
  readonly janela = input<EstadoJanelaPerguntas | null>(null);
  readonly alternandoJanela = input(false);
  readonly alternarJanela = output<void>();
  /** Quantas esperam o professor (badge da aba). */
  readonly pendentesMudou = output<number>();

  protected readonly regras = PERGUNTA_REGRAS;
  protected readonly dataHora = formatarDataHora;
  protected readonly hora = formatarHora;
  protected readonly relativo = tempoRelativo;
  protected readonly filtros: Array<{ valor: Filtro; rotulo: string }> = [
    { valor: 'ABERTA', rotulo: 'Abertas' },
    { valor: 'ENCERRADA', rotulo: 'Encerradas' },
    { valor: 'TODAS', rotulo: 'Todas' },
  ];

  protected readonly carregando = signal(true);
  protected readonly filtro = signal<Filtro>('ABERTA');
  protected readonly perguntas = signal<PerguntaProfessor[]>([]);
  protected readonly aberta = signal<DetalhePergunta<PerguntaProfessor> | null>(null);
  protected readonly texto = signal('');
  protected readonly ocupado = signal(false);
  protected readonly baixando = signal<string | null>(null);

  private readonly statusFiltro = computed<StatusPergunta | undefined>(() =>
    this.filtro() === 'TODAS' ? undefined : (this.filtro() as StatusPergunta),
  );

  ngOnInit(): void {
    this.carregar();
    // Sem tempo real (037 #9): atualiza com a aba aberta e visível.
    interval(PERGUNTA_REGRAS.POLLING_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState !== 'visible' || this.ocupado()) return;
        this.carregar();
        this.recarregarAberta();
      });
  }

  protected tipoSelo(p: PerguntaProfessor): string {
    if (p.status === 'ENCERRADA') return 'encerrada';
    return p.aguardando === 'AGUARDANDO_PROFESSOR' ? 'espera' : 'respondida';
  }

  protected rotuloSelo(p: PerguntaProfessor): string {
    const t = this.tipoSelo(p);
    return t === 'encerrada' ? 'Encerrada' : t === 'espera' ? 'Aguardando você' : 'Respondida';
  }

  protected mudarFiltro(f: Filtro): void {
    if (f === this.filtro()) return;
    this.filtro.set(f);
    this.carregando.set(true);
    this.carregar();
  }

  protected abrir(id: string): void {
    this.texto.set('');
    this.api
      .detalheDoProfessor(this.turmaId(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.aberta.set(d) });
  }

  protected fecharConversa(): void {
    this.aberta.set(null);
    this.texto.set('');
    this.carregar();
  }

  protected responder(id: string): void {
    const texto = this.texto().trim();
    if (!texto || this.ocupado()) return;
    this.ocupado.set(true);
    this.api
      .responderDoProfessor(this.turmaId(), id, texto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.texto.set('');
          this.recarregarAberta();
          this.carregar();
        },
        error: (e: HttpErrorResponse) => {
          this.ocupado.set(false);
          if ((e.error as { code?: string } | null)?.code === 'PERGUNTA_ENCERRADA') {
            this.recarregarAberta();
          }
        },
      });
  }

  protected encerrar(id: string): void {
    this.mudarStatus(this.api.encerrarDoProfessor(this.turmaId(), id));
  }

  protected reabrir(id: string): void {
    this.mudarStatus(this.api.reabrir(this.turmaId(), id));
  }

  protected baixarAnexo(perguntaId: string, mensagemId: string): void {
    this.baixando.set(mensagemId);
    this.api
      .anexoDoProfessor(this.turmaId(), perguntaId, mensagemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          this.baixando.set(null);
          baixar(url);
        },
        error: () => this.baixando.set(null),
      });
  }

  private mudarStatus(req: ReturnType<PerguntaApiService['reabrir']>): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.recarregarAberta();
        this.carregar();
      },
      error: () => this.ocupado.set(false),
    });
  }

  private carregar(): void {
    this.api
      .listarDaTurma(this.turmaId(), this.statusFiltro())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (l) => {
          this.perguntas.set(l);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });
    this.api
      .pendentes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => this.pendentesMudou.emit(p[this.turmaId()] ?? 0) });
  }

  private recarregarAberta(): void {
    const atual = this.aberta();
    if (!atual) return;
    this.api
      .detalheDoProfessor(this.turmaId(), atual.pergunta.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.aberta.set(d) });
  }
}
