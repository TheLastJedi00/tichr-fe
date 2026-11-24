import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { formatarDataHora } from '../../core/date-format';
import {
  baixar,
  DetalhePergunta,
  erroDoArquivo,
  Pergunta,
  PERGUNTA_REGRAS,
  PerguntaApiService,
  tamanhoLegivel,
} from '../../core/pergunta-api.service';
import { Card } from '../../ui/card/card';
import { ConversaPergunta } from '../../ui/conversa-pergunta/conversa-pergunta';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

/** Selo da pergunta do ponto de vista do aluno. */
function selo(p: Pergunta): { texto: string; tipo: string } {
  if (p.status === 'ENCERRADA') return { texto: 'Encerrada', tipo: 'encerrada' };
  return p.aguardando === 'AGUARDANDO_ALUNO'
    ? { texto: 'Respondida', tipo: 'respondida' }
    : { texto: 'Aguardando o professor', tipo: 'aguardando' };
}

/**
 * Perguntas ao professor (spec 037), no portal do aluno: lista das minhas
 * perguntas, nova pergunta com anexo opcional e a conversa de cada uma. Só o
 * aluno e o professor veem. Com a janela fechada, o aluno só lê.
 */
@Component({
  selector: 'app-student-perguntas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Card, ConversaPergunta, Icon, Spinner],
  template: `
    @if (aberta(); as d) {
      <button type="button" class="voltar" (click)="fecharConversa()">← Minhas perguntas</button>
      <h1 class="titulo titulo--conversa">{{ d.pergunta.titulo }}</h1>
      <p class="sub">
        <span class="selo" [attr.data-tipo]="selo(d.pergunta).tipo">{{ selo(d.pergunta).texto }}</span>
        Aberta em {{ dataHora(d.pergunta.criadaEm) }}
      </p>

      <app-conversa-pergunta
        [mensagens]="d.mensagens"
        eu="ALUNO"
        nomeAluno="Você"
        [baixando]="baixando()"
        (baixar)="baixarAnexo(d.pergunta.id, $event)"
      />

      @if (d.pergunta.status === 'ENCERRADA') {
        <p class="aviso" role="status">
          <app-icon name="lock" [size]="16" />
          Esta pergunta foi encerrada{{ d.pergunta.encerradaPor === 'PROFESSOR' ? ' pelo professor' : '' }}.
          Se a dúvida voltar, abra uma nova pergunta.
        </p>
      } @else if (!janelaAberta()) {
        <p class="aviso" role="status">
          <app-icon name="lock" [size]="16" />
          As perguntas estão fechadas. O professor abre durante a aula.
        </p>
      } @else {
        <form class="resposta" (ngSubmit)="responder(d.pergunta.id)">
          <textarea
            class="tichr-input"
            name="resposta"
            rows="3"
            [maxlength]="regras.TEXTO_MAX"
            [ngModel]="texto()"
            (ngModelChange)="texto.set($event)"
            placeholder="Escreva sua mensagem"
          ></textarea>
          <div class="resposta__acoes">
            <label class="btn-outline anexar">
              <app-icon name="paperclip" [size]="16" />
              {{ arquivo() ? 'Trocar arquivo' : 'Anexar arquivo' }}
              <input type="file" [accept]="regras.ACCEPT" (change)="escolherArquivo($event)" hidden />
            </label>
            <button type="submit" class="btn-primary" [disabled]="!podeResponder() || enviando()">
              <app-icon name="send" [size]="16" />
              {{ enviando() ? 'Enviando…' : 'Enviar' }}
            </button>
          </div>
          @if (arquivo(); as f) {
            <span class="arquivo">
              <app-icon name="paperclip" [size]="14" /> {{ f.name }} · {{ tamanho(f.size) }}
              <button type="button" class="arquivo__tirar" (click)="tirarArquivo()" aria-label="Tirar arquivo">✕</button>
            </span>
          }
          @if (erroArquivo()) {
            <span class="erro" role="alert">{{ erroArquivo() }}</span>
          }
        </form>
        <button type="button" class="btn-outline resolvida" [disabled]="encerrando()" (click)="encerrar(d.pergunta.id)">
          <app-icon name="check" [size]="16" /> Minha dúvida foi resolvida
        </button>
      }
    } @else {
      <a class="voltar" routerLink="/aluno/dashboard">← Início</a>
      <h1 class="titulo"><app-icon name="chat" [size]="22" /> Perguntar ao professor</h1>
      <p class="sub">Só você e o professor veem suas perguntas.</p>

      @if (carregando()) {
        <div class="loading"><app-spinner [size]="32" /></div>
      } @else {
        <app-card>
          @if (!janelaAberta()) {
            <div class="fechadas" role="status">
              <app-icon name="lock" [size]="22" />
              <div>
                <strong>As perguntas estão fechadas.</strong>
                <span>O professor abre durante a aula. Você ainda pode ler as respostas abaixo.</span>
              </div>
            </div>
          } @else {
            <form class="form" (ngSubmit)="criar()">
              <label class="campo">
                <span class="campo__lbl">Sobre o que é sua dúvida?</span>
                <input
                  class="tichr-input"
                  name="titulo"
                  [maxlength]="regras.TITULO_MAX"
                  [ngModel]="titulo()"
                  (ngModelChange)="titulo.set($event)"
                  placeholder="Ex.: Exercício 3 da lista"
                />
              </label>
              <label class="campo">
                <span class="campo__lbl">Sua pergunta</span>
                <textarea
                  class="tichr-input"
                  name="texto"
                  rows="4"
                  [maxlength]="regras.TEXTO_MAX"
                  [ngModel]="texto()"
                  (ngModelChange)="texto.set($event)"
                  placeholder="Explique a dúvida (opcional se anexar um arquivo)"
                ></textarea>
                <span class="contador">{{ texto().length }}/{{ regras.TEXTO_MAX }}</span>
              </label>
              <div class="campo">
                <span class="campo__lbl">Arquivo (opcional)</span>
                <label class="btn-outline anexar">
                  <app-icon name="paperclip" [size]="16" />
                  {{ arquivo() ? 'Trocar arquivo' : 'Anexar arquivo' }}
                  <input type="file" [accept]="regras.ACCEPT" (change)="escolherArquivo($event)" hidden />
                </label>
                <span class="dica">HTML, CSS, PDF ou Word, até 4 MB. Imagens não são aceitas.</span>
                @if (arquivo(); as f) {
                  <span class="arquivo">
                    <app-icon name="paperclip" [size]="14" /> {{ f.name }} · {{ tamanho(f.size) }}
                    <button type="button" class="arquivo__tirar" (click)="tirarArquivo()" aria-label="Tirar arquivo">✕</button>
                  </span>
                }
                @if (erroArquivo()) {
                  <span class="erro" role="alert">{{ erroArquivo() }}</span>
                }
              </div>
              <button type="submit" class="btn-primary" [disabled]="!podeCriar() || enviando()">
                {{ enviando() ? 'Enviando…' : 'Enviar pergunta' }}
              </button>
            </form>
          }
        </app-card>

        <h2 class="secao">Minhas perguntas</h2>
        @if (minhas().length) {
          <ul class="lista">
            @for (p of minhas(); track p.id) {
              <li>
                <button type="button" class="item" (click)="abrir(p.id)">
                  <span class="item__top">
                    <strong>{{ p.titulo }}</strong>
                    <span class="selo" [attr.data-tipo]="selo(p).tipo">{{ selo(p).texto }}</span>
                  </span>
                  <span class="item__data">
                    @if (p.temAnexo) { <app-icon name="paperclip" [size]="14" /> }
                    {{ p.totalMensagens }} {{ p.totalMensagens === 1 ? 'mensagem' : 'mensagens' }}
                    · {{ dataHora(p.atualizadaEm) }}
                  </span>
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="vazio">Você ainda não fez nenhuma pergunta.</p>
        }
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
    .titulo { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1.5rem; font-weight: 800; }
    .titulo--conversa { overflow-wrap: anywhere; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0.25rem 0 1rem; color: var(--text-muted); }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .campo { display: flex; flex-direction: column; gap: 0.4rem; }
    .campo__lbl { font-weight: 700; font-size: 0.92rem; }
    textarea.tichr-input { resize: vertical; min-height: 80px; font-family: inherit; }
    .contador, .dica { font-size: 0.78rem; color: var(--text-muted); }
    .contador { align-self: flex-end; }
    .anexar { display: inline-flex; align-items: center; gap: 0.4rem; align-self: flex-start; cursor: pointer; }
    .arquivo { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; font-weight: 600; overflow-wrap: anywhere; }
    .arquivo__tirar { border: 0; background: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; }
    .erro { color: var(--danger); font-size: 0.85rem; font-weight: 600; }
    .fechadas { display: flex; gap: 0.75rem; align-items: flex-start; color: var(--text-muted); }
    .fechadas div { display: flex; flex-direction: column; color: var(--text); }
    .fechadas span { color: var(--text-muted); }
    .secao { margin: 1.5rem 0 0.75rem; font-size: 1.1rem; font-weight: 800; }
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
    .item__top { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    .item__top strong { overflow-wrap: anywhere; }
    .item__data { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: var(--text-muted); }
    .selo { font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; white-space: nowrap; }
    .selo[data-tipo='aguardando'] { color: var(--warning); border: 1px solid var(--warning); }
    .selo[data-tipo='respondida'] { color: var(--success); border: 1px solid var(--success); }
    .selo[data-tipo='encerrada'] { color: var(--text-muted); border: 1px solid var(--border); }
    .vazio { color: var(--text-muted); }
    .aviso { display: flex; align-items: center; gap: 0.4rem; margin: 1rem 0 0; color: var(--text-muted); font-weight: 600; }
    .resposta { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
    .resposta__acoes { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .resposta__acoes .btn-primary { display: inline-flex; align-items: center; gap: 0.4rem; }
    .resolvida { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 1rem; }
  `,
})
export class StudentPerguntasPage {
  private readonly api = inject(PerguntaApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly regras = PERGUNTA_REGRAS;
  protected readonly selo = selo;
  protected readonly dataHora = formatarDataHora;
  protected readonly tamanho = tamanhoLegivel;

  protected readonly carregando = signal(true);
  protected readonly janelaAberta = signal(false);
  protected readonly minhas = signal<Pergunta[]>([]);
  protected readonly aberta = signal<DetalhePergunta | null>(null);

  protected readonly titulo = signal('');
  protected readonly texto = signal('');
  protected readonly arquivo = signal<File | null>(null);
  protected readonly erroArquivo = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly encerrando = signal(false);
  protected readonly baixando = signal<string | null>(null);

  protected readonly podeCriar = computed(
    () => !!this.titulo().trim() && (!!this.texto().trim() || !!this.arquivo()),
  );
  protected readonly podeResponder = computed(() => !!this.texto().trim() || !!this.arquivo());

  constructor() {
    this.recarregar(true);
    // Sem tempo real (037 #9): atualiza com a tela aberta e visível.
    interval(PERGUNTA_REGRAS.POLLING_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'visible' && !this.enviando()) this.recarregar(false);
      });
  }

  protected abrir(id: string): void {
    this.limparFormulario();
    this.api
      .detalheDoAluno(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.aberta.set(d) });
  }

  protected fecharConversa(): void {
    this.aberta.set(null);
    this.limparFormulario();
    this.recarregar(false);
  }

  protected escolherArquivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    input.value = '';
    if (!f) return;
    const erro = erroDoArquivo(f);
    this.erroArquivo.set(erro);
    this.arquivo.set(erro ? null : f);
  }

  protected tirarArquivo(): void {
    this.arquivo.set(null);
    this.erroArquivo.set(null);
  }

  protected criar(): void {
    if (!this.podeCriar() || this.enviando()) return;
    this.enviando.set(true);
    this.api
      .criar({ titulo: this.titulo().trim(), texto: this.texto().trim() || undefined }, this.arquivo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ id }) => {
          this.enviando.set(false);
          this.abrir(id);
        },
        error: (e: HttpErrorResponse) => this.falhou(e),
      });
  }

  protected responder(id: string): void {
    if (!this.podeResponder() || this.enviando()) return;
    this.enviando.set(true);
    this.api
      .responderDoAluno(id, this.texto().trim() || undefined, this.arquivo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.limparFormulario();
          this.recarregarAberta();
        },
        error: (e: HttpErrorResponse) => this.falhou(e),
      });
  }

  protected encerrar(id: string): void {
    this.encerrando.set(true);
    this.api
      .encerrarDoAluno(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.encerrando.set(false);
          this.recarregarAberta();
        },
        error: () => this.encerrando.set(false),
      });
  }

  protected baixarAnexo(perguntaId: string, mensagemId: string): void {
    this.baixando.set(mensagemId);
    this.api
      .anexoDoAluno(perguntaId, mensagemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          this.baixando.set(null);
          baixar(url);
        },
        error: () => this.baixando.set(null),
      });
  }

  /** O interceptor mostra o motivo; aqui só ajusta a tela. */
  private falhou(e: HttpErrorResponse): void {
    this.enviando.set(false);
    const codigo = (e.error as { code?: string } | null)?.code;
    if (codigo === 'PERGUNTAS_FECHADAS') this.janelaAberta.set(false);
    if (codigo === 'PERGUNTA_ENCERRADA') this.recarregarAberta();
  }

  private recarregar(primeira: boolean): void {
    this.api
      .estadoAluno()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (e) => {
          this.janelaAberta.set(e.abertas);
          if (primeira) this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });
    this.api
      .minhas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (l) => this.minhas.set(l) });
    this.recarregarAberta();
  }

  private recarregarAberta(): void {
    const atual = this.aberta();
    if (!atual) return;
    this.api
      .detalheDoAluno(atual.pergunta.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.aberta.set(d) });
  }

  private limparFormulario(): void {
    this.titulo.set('');
    this.texto.set('');
    this.arquivo.set(null);
    this.erroArquivo.set(null);
  }
}
