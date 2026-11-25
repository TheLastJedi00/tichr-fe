import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatarDataHora } from '../../core/date-format';
import { baixar, erroDoArquivo, PERGUNTA_REGRAS, tamanhoLegivel } from '../../core/pergunta-api.service';
import {
  DetalheTrabalhoAluno,
  Entrega,
  EstadoEntrega,
  faltaParaPrazo,
  formatarNota,
  formatarPrazo,
  TRABALHO_REGRAS,
  TrabalhoApiService,
  TrabalhoDoAluno,
} from '../../core/trabalho-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

/** Selo da entrega do ponto de vista do aluno. */
function selo(estado: EstadoEntrega, nota: number | null): { texto: string; tipo: string } {
  switch (estado) {
    case 'PENDENTE':
      return { texto: 'Pendente', tipo: 'pendente' };
    case 'ENTREGUE':
      return { texto: 'Entregue', tipo: 'entregue' };
    case 'AVALIADA':
      return { texto: nota === null ? 'Avaliada' : `Avaliada · ${formatarNota(nota)}`, tipo: 'avaliada' };
    default:
      return { texto: 'Prazo encerrado', tipo: 'perdida' };
  }
}

/** Recusas que mudam o estado da tela: relê a atividade. */
const CODIGOS_DE_ESTADO = ['PRAZO_ENCERRADO', 'ENTREGA_AVALIADA', 'LIMITE_ARQUIVOS'];

/**
 * Trabalhos (spec 038), no portal do aluno: as atividades da turma com o
 * estado da minha entrega e, em cada uma, o canva de texto (até 10.000
 * caracteres) e os arquivos (até 5, um envio por vez). Edita até o prazo ou a
 * avaliação; depois, só leitura com a nota e o comentário do professor.
 */
@Component({
  selector: 'app-student-trabalhos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Card, Icon, Spinner],
  template: `
    @if (aberto(); as d) {
      <button type="button" class="voltar" (click)="fechar()">← Meus trabalhos</button>
      <h1 class="titulo">{{ d.atividade.titulo }}</h1>
      <p class="sub">
        <span class="selo" [attr.data-tipo]="selo(d.estado, d.entrega?.avaliacao?.nota ?? null).tipo">
          {{ selo(d.estado, d.entrega?.avaliacao?.nota ?? null).texto }}
        </span>
        <span><app-icon name="calendar" [size]="14" /> Até {{ prazo(d.atividade.prazo) }}</span>
        @if (d.atividade.aberta && d.estado !== 'AVALIADA' && falta(d.atividade.prazo); as f) { <strong>· {{ f }}</strong> }
      </p>

      @if (d.entrega?.avaliacao; as av) {
        <app-card>
          <div class="nota">
            <app-icon name="trophy" [size]="22" />
            <div>
              <strong class="nota__valor">Nota {{ nota(av.nota) }}</strong>
              <span class="muted">+{{ av.pontos }} {{ av.pontos === 1 ? 'ponto' : 'pontos' }} no ranking</span>
            </div>
          </div>
          @if (av.comentario) {
            <p class="comentario"><strong>Comentário do professor:</strong> {{ av.comentario }}</p>
          }
        </app-card>
      }

      @if (d.atividade.descricao) {
        <p class="descricao">{{ d.atividade.descricao }}</p>
      }
      <p class="muted vale">Vale até {{ d.atividade.valorPontos }} pontos no ranking.</p>

      @if (!editavel()) {
        <p class="aviso" role="status">
          <app-icon name="lock" [size]="16" />
          {{ d.estado === 'AVALIADA' ? 'O professor já avaliou: a entrega não pode mais ser alterada.' : 'O prazo acabou: a entrega não pode mais ser alterada.' }}
        </p>
      }

      <h2 class="secao">Texto</h2>
      @if (editavel()) {
        <div class="canva">
          <textarea
            class="tichr-input"
            name="texto"
            rows="14"
            [maxlength]="regras.TEXTO_MAX"
            [ngModel]="texto()"
            (ngModelChange)="texto.set($event)"
            placeholder="Escreva ou cole aqui o texto do seu trabalho"
          ></textarea>
          <div class="canva__rodape">
            <span class="contador" [class.contador--cheio]="texto().length >= regras.TEXTO_MAX">
              {{ milhar(texto().length) }} / {{ milhar(regras.TEXTO_MAX) }}
            </span>
            <span class="estado-texto" aria-live="polite">{{ estadoTexto() }}</span>
            <button type="button" class="btn-primary" [disabled]="!textoMudou() || salvandoTexto()" (click)="salvarTexto()">
              {{ salvandoTexto() ? 'Salvando…' : 'Salvar texto' }}
            </button>
          </div>
        </div>
      } @else if (d.entrega?.texto) {
        <div class="canva-leitura" tabindex="0">{{ d.entrega?.texto }}</div>
      } @else {
        <p class="muted">Sem texto.</p>
      }

      <h2 class="secao">Arquivos</h2>
      @if (d.entrega?.arquivos?.length) {
        <ul class="chips">
          @for (arq of d.entrega?.arquivos ?? []; track arq.id) {
            <li class="chip-linha">
              <button type="button" class="chip" [disabled]="baixando() === arq.id" (click)="baixarArquivo(d, arq.id)">
                <app-icon name="paperclip" [size]="14" />
                <span class="chip__nome">{{ arq.nome }}</span>
                <span class="chip__tam">{{ tamanho(arq.tamanho) }}</span>
                <span class="chip__acao"><app-icon name="download" [size]="14" /> {{ baixando() === arq.id ? 'Abrindo…' : 'Baixar' }}</span>
              </button>
              @if (editavel()) {
                <button
                  type="button"
                  class="chip__tirar"
                  [disabled]="removendo() === arq.id || !!enviando()"
                  [attr.aria-label]="'Remover ' + arq.nome"
                  (click)="removerArquivo(d, arq.id, arq.nome)"
                >Remover</button>
              }
            </li>
          }
        </ul>
      } @else if (!editavel()) {
        <p class="muted">Sem arquivos.</p>
      }

      @if (editavel()) {
        @if (enviando(); as env) {
          <div class="progresso" role="status">
            <span>Enviando {{ env.nome }} ({{ env.atual }} de {{ env.total }}) · {{ env.pct }}%</span>
            <span class="trilho"><span class="trilho__fill" [style.width.%]="env.pct"></span></span>
          </div>
        } @else if (vagas() > 0) {
          <label class="btn-outline anexar">
            <app-icon name="paperclip" [size]="16" /> Anexar arquivos
            <input type="file" multiple [accept]="accept" (change)="escolherArquivos($event)" hidden />
          </label>
        }
        <span class="dica">
          HTML, CSS, PDF ou Word, até 4 MB cada. Imagens não são aceitas.
          {{ vagas() > 0 ? 'Ainda cabem ' + vagas() + (vagas() === 1 ? ' arquivo.' : ' arquivos.') : 'Limite de ' + regras.MAX_ARQUIVOS + ' arquivos atingido.' }}
        </span>
        @for (e of errosArquivo(); track e) {
          <span class="erro" role="alert">{{ e }}</span>
        }
      }
    } @else {
      <a class="voltar" routerLink="/aluno/dashboard">← Início</a>
      <h1 class="titulo"><app-icon name="book" [size]="22" /> Trabalhos</h1>
      <p class="sub">Entregue até o prazo. Só você e o professor veem sua entrega.</p>

      @if (carregando()) {
        <div class="loading"><app-spinner [size]="32" /></div>
      } @else if (bloqueado()) {
        <p class="vazio">O envio de trabalhos não está disponível nesta turma.</p>
      } @else if (trabalhos().length === 0) {
        <p class="vazio">O professor ainda não passou nenhum trabalho.</p>
      } @else {
        <ul class="lista">
          @for (t of trabalhos(); track t.atividade.id) {
            <li>
              <button type="button" class="item" [class.item--pendente]="t.estado === 'PENDENTE'" (click)="abrir(t.atividade.id)">
                <span class="item__top">
                  <strong>{{ t.atividade.titulo }}</strong>
                  <span class="selo" [attr.data-tipo]="selo(t.estado, t.nota).tipo">{{ selo(t.estado, t.nota).texto }}</span>
                </span>
                <span class="item__data">
                  <app-icon name="calendar" [size]="14" />
                  Até {{ prazo(t.atividade.prazo) }}
                  @if (t.estado === 'PENDENTE' && falta(t.atividade.prazo); as f) { · <strong>{{ f }}</strong> }
                </span>
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
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
    .titulo { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1.5rem; font-weight: 800; overflow-wrap: anywhere; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0.25rem 0 1rem; color: var(--text-muted); }
    .sub span { display: inline-flex; align-items: center; gap: 0.3rem; }
    .sub strong { color: var(--text); }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .vazio, .muted { color: var(--text-muted); margin: 0; }
    .descricao { white-space: pre-wrap; overflow-wrap: anywhere; margin: 1rem 0 0.25rem; }
    .vale { font-size: 0.85rem; margin-top: 0.25rem; }
    .aviso { display: flex; align-items: center; gap: 0.4rem; margin: 1rem 0 0; padding: 0.6rem 0.8rem; border: 2px solid var(--border); border-radius: 10px; color: var(--text-muted); font-weight: 600; }
    .secao { margin: 1.5rem 0 0.6rem; font-size: 1.1rem; font-weight: 800; }
    .nota { display: flex; align-items: center; gap: 0.75rem; color: var(--success); }
    .nota div { display: flex; flex-direction: column; }
    .nota__valor { font-size: 1.25rem; color: var(--text); }
    .comentario { margin: 0.75rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .canva { display: flex; flex-direction: column; gap: 0.5rem; }
    .canva textarea { resize: vertical; min-height: 16rem; font-family: inherit; line-height: 1.5; }
    .canva__rodape { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end; }
    .contador { font-size: 0.8rem; color: var(--text-muted); font-variant-numeric: tabular-nums; margin-right: auto; }
    .contador--cheio { color: var(--danger); font-weight: 700; }
    .estado-texto { font-size: 0.85rem; color: var(--text-muted); }
    .canva-leitura {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-height: 26rem;
      overflow-y: auto;
      padding: 0.8rem 0.9rem;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      line-height: 1.5;
    }
    .chips { list-style: none; margin: 0 0 0.75rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .chip-linha { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
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
    .chip__tirar { border: 0; background: none; color: var(--danger); font: inherit; font-weight: 600; cursor: pointer; }
    .chip__tirar:disabled { opacity: 0.5; cursor: default; }
    .anexar { display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; }
    .dica { display: block; margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted); }
    .erro { display: block; color: var(--danger); font-size: 0.85rem; font-weight: 600; margin-top: 0.3rem; }
    .progresso { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; font-weight: 600; }
    .trilho { height: 10px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .trilho__fill { display: block; height: 100%; background: var(--primary); }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .item {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.85rem 0.95rem;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .item:hover { border-color: var(--primary); }
    .item--pendente { border-left: 6px solid var(--primary); }
    .item__top { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    .item__top strong { overflow-wrap: anywhere; }
    .item__data { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--text-muted); }
    .item__data strong { color: var(--text); }
    .selo { font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; white-space: nowrap; }
    .selo[data-tipo='pendente'] { color: var(--primary); border: 1px solid var(--primary); }
    .selo[data-tipo='entregue'] { color: var(--success); border: 1px solid var(--success); }
    .selo[data-tipo='avaliada'] { color: var(--success); border: 1px solid var(--success); background: var(--surface-alt); }
    .selo[data-tipo='perdida'] { color: var(--text-muted); border: 1px solid var(--border); }
  `,
})
export class StudentTrabalhosPage {
  private readonly api = inject(TrabalhoApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly regras = TRABALHO_REGRAS;
  protected readonly accept = PERGUNTA_REGRAS.ACCEPT;
  protected readonly selo = selo;
  protected readonly prazo = formatarPrazo;
  protected readonly nota = formatarNota;
  protected readonly tamanho = tamanhoLegivel;
  protected readonly falta = (iso: string) => faltaParaPrazo(iso);
  protected readonly milhar = (n: number) => n.toLocaleString('pt-BR');

  protected readonly carregando = signal(true);
  protected readonly trabalhos = signal<TrabalhoDoAluno[]>([]);
  /** Professor fora do PhD (403): o recurso não existe para esta turma. */
  protected readonly bloqueado = signal(false);

  protected readonly aberto = signal<DetalheTrabalhoAluno | null>(null);
  protected readonly texto = signal('');
  protected readonly salvandoTexto = signal(false);
  protected readonly salvoEm = signal<string | null>(null);
  protected readonly enviando = signal<{ nome: string; atual: number; total: number; pct: number } | null>(null);
  protected readonly errosArquivo = signal<string[]>([]);
  protected readonly removendo = signal<string | null>(null);
  protected readonly baixando = signal<string | null>(null);

  /** Até o prazo ou a avaliação, o que vier primeiro (038 #10). */
  protected readonly editavel = computed(() => {
    const d = this.aberto();
    return !!d && d.atividade.aberta && d.estado !== 'AVALIADA';
  });
  protected readonly textoMudou = computed(() => this.texto() !== (this.aberto()?.entrega?.texto ?? ''));
  protected readonly vagas = computed(
    () => TRABALHO_REGRAS.MAX_ARQUIVOS - (this.aberto()?.entrega?.arquivos.length ?? 0),
  );
  protected readonly estadoTexto = computed(() => {
    if (this.textoMudou()) return 'Alterações não salvas';
    const em = this.salvoEm() ?? this.aberto()?.entrega?.atualizadaEm;
    return this.aberto()?.entrega?.texto && em ? `Salvo ${formatarDataHora(em)}` : '';
  });

  constructor() {
    this.carregar();
  }

  protected abrir(atividadeId: string): void {
    this.errosArquivo.set([]);
    this.salvoEm.set(null);
    this.api
      .detalhe(atividadeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.aberto.set(d);
          this.texto.set(d.entrega?.texto ?? '');
        },
      });
  }

  protected fechar(): void {
    if (this.editavel() && this.textoMudou() && !confirm('Sair sem salvar o texto?')) return;
    this.aberto.set(null);
    this.carregar();
  }

  protected salvarTexto(): void {
    const d = this.aberto();
    if (!d || this.salvandoTexto()) return;
    this.salvandoTexto.set(true);
    this.api
      .salvarTexto(d.atividade.id, this.texto())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entrega) => {
          this.salvandoTexto.set(false);
          this.salvoEm.set(entrega.atualizadaEm);
          this.atualizar(entrega);
        },
        error: (e: HttpErrorResponse) => {
          this.salvandoTexto.set(false);
          this.recarregarSeMudou(e);
        },
      });
  }

  /**
   * Vários arquivos de uma vez, enviados um por requisição (038 #9). Recusa
   * antes de enviar o que o backend recusaria (tipo, 4 MB, limite de 5).
   */
  protected escolherArquivos(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const escolhidos = Array.from(input.files ?? []);
    input.value = '';
    const erros: string[] = [];
    const fila: File[] = [];
    for (const f of escolhidos) {
      const erro = erroDoArquivo(f);
      if (erro) {
        erros.push(`${f.name}: ${erro}`);
      } else if (fila.length >= this.vagas()) {
        erros.push(`${f.name}: cada entrega pode ter até ${TRABALHO_REGRAS.MAX_ARQUIVOS} arquivos.`);
      } else {
        fila.push(f);
      }
    }
    this.errosArquivo.set(erros);
    const d = this.aberto();
    if (d && fila.length) this.enviarFila(d.atividade.id, fila, 0);
  }

  protected removerArquivo(d: DetalheTrabalhoAluno, arquivoId: string, nome: string): void {
    if (!confirm(`Remover ${nome}?`)) return;
    this.removendo.set(arquivoId);
    this.api
      .removerArquivo(d.atividade.id, arquivoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entrega) => {
          this.removendo.set(null);
          this.atualizar(entrega);
        },
        error: (e: HttpErrorResponse) => {
          this.removendo.set(null);
          this.recarregarSeMudou(e);
        },
      });
  }

  protected baixarArquivo(d: DetalheTrabalhoAluno, arquivoId: string): void {
    this.baixando.set(arquivoId);
    this.api
      .arquivoDoAluno(d.atividade.id, arquivoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          this.baixando.set(null);
          baixar(url);
        },
        error: () => this.baixando.set(null),
      });
  }

  private enviarFila(atividadeId: string, fila: File[], i: number): void {
    if (i >= fila.length) {
      this.enviando.set(null);
      return;
    }
    const f = fila[i];
    this.enviando.set({ nome: f.name, atual: i + 1, total: fila.length, pct: 0 });
    this.api
      .enviarArquivo(atividadeId, f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          if (ev.type === HttpEventType.UploadProgress && ev.total) {
            this.enviando.set({ nome: f.name, atual: i + 1, total: fila.length, pct: Math.round((100 * ev.loaded) / ev.total) });
          } else if (ev.type === HttpEventType.Response && ev.body) {
            this.atualizar(ev.body);
            this.enviarFila(atividadeId, fila, i + 1);
          }
        },
        error: (e: HttpErrorResponse) => {
          // Para a fila: o resto ficaria com o mesmo problema (prazo, limite).
          this.enviando.set(null);
          this.recarregarSeMudou(e);
        },
      });
  }

  /** A resposta do envio já traz a entrega: atualiza sem nova leitura. */
  private atualizar(entrega: Entrega): void {
    const d = this.aberto();
    if (!d) return;
    this.aberto.set({ ...d, estado: entrega.estado, entrega });
    if (!this.textoMudou()) this.texto.set(entrega.texto ?? '');
  }

  private recarregarSeMudou(e: HttpErrorResponse): void {
    const code = (e.error as { code?: string } | null)?.code;
    const d = this.aberto();
    if (d && code && CODIGOS_DE_ESTADO.includes(code)) this.abrir(d.atividade.id);
  }

  private carregar(): void {
    this.api
      .meus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (l) => {
          this.trabalhos.set(l);
          this.carregando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.bloqueado.set(e.status === 403);
          this.carregando.set(false);
        },
      });
  }
}
