import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApiService } from '../../core/admin-api.service';
import { formatarDataHora } from '../../core/date-format';
import { CategoriaFeedback, Feedback, StatusFeedback } from '../../core/models';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

const CATEGORIAS: Record<CategoriaFeedback, string> = {
  BUG: 'Relato de Bug',
  SUGESTAO: 'Sugestão de Melhoria',
  DUVIDA: 'Dúvida Técnica',
  ELOGIO: 'Elogio',
};

const STATUS: Record<StatusFeedback, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em análise',
  RESOLVIDO: 'Resolvido',
};

const FLUXO: StatusFeedback[] = ['PENDENTE', 'EM_ANALISE', 'RESOLVIDO'];

/**
 * Caixa de entrada da triagem.
 *
 * Sem tempo real, ao contrário das partidas dos jogos: `feedbacks` carrega
 * e-mail, nome e texto de todo professor, e as Firestore Rules não conseguiriam
 * proteger a coleção (o front não tem sessão do Firebase Auth, então lá só
 * existe `if true` ou `if false`). A tela diz isso em vez de fingir que se
 * atualiza sozinha: tem botão de Atualizar.
 */
@Component({
  selector: 'app-admin-feedbacks-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal, Spinner],
  template: `
    <header class="head">
      <span class="tag"><app-icon name="mail" [size]="15" /> Backoffice</span>
      <div class="head__linha">
        <h1>Feedbacks</h1>
        <button class="btn-outline" type="button" (click)="carregar()">Atualizar</button>
      </div>
    </header>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <ul class="lista">
        @for (f of feedbacks(); track f.id) {
          <li class="card" (click)="abrir(f)">
            <div class="card__top">
              <span class="badge cat--{{ f.categoria }}">{{ rotuloCategoria(f.categoria) }}</span>
              <span class="badge st--{{ f.status }}">{{ rotuloStatus(f.status) }}</span>
            </div>
            <strong class="nome">{{ f.professorNome || f.professorEmail || 'Sem nome' }}</strong>
            <p class="trecho">{{ f.mensagem }}</p>
            <div class="meta">
              <span>{{ data(f.criadoEm) }}</span>
              <span class="rota">{{ f.rota }}</span>
              @if (!f.notificadoEm) {
                <span class="alerta"><app-icon name="alert" [size]="13" /> alerta não enviado</span>
              }
            </div>
          </li>
        } @empty {
          <p class="vazio">Nenhum feedback ainda.</p>
        }
      </ul>
    }

    @if (selecionado(); as f) {
      <app-modal [open]="true" [title]="rotuloCategoria(f.categoria)" (close)="fechar()">
        <div class="det">
          <p class="linha"><span>De</span><strong>{{ f.professorNome || 'Sem nome' }}</strong></p>
          <p class="linha"><span>E-mail</span><strong>{{ f.professorEmail || '—' }}</strong></p>
          <p class="linha"><span>Tela</span><strong>{{ f.rota }}</strong></p>
          <p class="linha"><span>Enviado em</span><strong>{{ data(f.criadoEm) }}</strong></p>
          <p class="linha ua"><span>Navegador</span><strong>{{ f.userAgent }}</strong></p>

          @if (!f.notificadoEm) {
            <p class="aviso">
              <app-icon name="alert" [size]="14" />
              O alerta por e-mail não saiu para este relato.
            </p>
          }

          <div class="grupo">
            <span>Mensagem</span>
            <p class="mensagem">{{ f.mensagem }}</p>
          </div>

          <div class="grupo">
            <span>Status</span>
            <div class="acoes">
              @for (s of fluxo; track s) {
                <button
                  class="btn-outline"
                  type="button"
                  [class.ativo]="f.status === s"
                  [disabled]="salvando()"
                  (click)="mudarStatus(f, s)"
                >
                  {{ rotuloStatus(s) }}
                </button>
              }
            </div>
          </div>

          <label class="grupo">
            <span>Nota interna (o professor não vê)</span>
            <textarea
              class="tichr-input"
              rows="3"
              maxlength="2000"
              [value]="nota()"
              (input)="nota.set($any($event.target).value)"
            ></textarea>
            <button class="btn-outline" type="button" [disabled]="salvando()" (click)="salvarNota(f)">
              Salvar nota
            </button>
          </label>

          @if (msg()) { <p class="msg">{{ msg() }}</p> }
        </div>
      </app-modal>
    }
  `,
  styles: `
    .head { margin-bottom: 1rem; }
    .tag { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 700; color: var(--primary); }
    .head__linha { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .head h1 { margin: 0.25rem 0 0; font-size: 1.4rem; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: border-color 0.15s ease;
    }
    .card:hover { border-color: var(--primary); }
    .card__top { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .nome { font-size: 0.95rem; }
    .trecho {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .meta { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.75rem; color: var(--text-muted); }
    .rota { font-family: ui-monospace, monospace; }
    .alerta { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--warning); font-weight: 600; }

    /* Sem .badge global no projeto: cada tela monta o seu com esta fórmula. */
    .badge { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .cat--BUG { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }
    .cat--SUGESTAO { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
    .cat--DUVIDA { background: var(--surface-alt); color: var(--text-muted); }
    .cat--ELOGIO { background: color-mix(in srgb, var(--success) 14%, transparent); color: var(--success); }
    .st--PENDENTE { background: color-mix(in srgb, var(--warning) 16%, transparent); color: var(--warning); margin-left: auto; }
    .st--EM_ANALISE { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); margin-left: auto; }
    .st--RESOLVIDO { background: color-mix(in srgb, var(--success) 14%, transparent); color: var(--success); margin-left: auto; }

    .vazio { color: var(--text-muted); text-align: center; padding: 1.5rem; }
    .det { display: flex; flex-direction: column; gap: 0.85rem; }
    .linha { display: flex; justify-content: space-between; gap: 0.75rem; margin: 0; font-size: 0.9rem; }
    .linha span { color: var(--text-muted); flex: 0 0 auto; }
    .linha strong { text-align: right; word-break: break-word; }
    .ua strong { font-size: 0.75rem; font-weight: 400; color: var(--text-muted); }
    .aviso {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin: 0;
      padding: 0.5rem 0.65rem;
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--warning) 12%, transparent);
      color: var(--warning);
      font-size: 0.8rem;
      font-weight: 600;
    }
    .grupo { display: flex; flex-direction: column; gap: 0.4rem; }
    .grupo > span { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .mensagem {
      margin: 0;
      padding: 0.75rem;
      border-left: 3px solid var(--primary);
      background: var(--surface-alt);
      border-radius: 4px;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .acoes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; }
    .acoes .btn-outline { font-size: 0.78rem; padding: 0.5rem 0.25rem; }
    .acoes .btn-outline.ativo { border-color: var(--primary); color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
    textarea.tichr-input { resize: vertical; font: inherit; }
    .msg { margin: 0; font-size: 0.85rem; color: var(--primary); }
  `,
})
export class AdminFeedbacksPage {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly fluxo = FLUXO;
  protected readonly feedbacks = signal<Feedback[]>([]);
  protected readonly carregando = signal(true);
  protected readonly selecionado = signal<Feedback | null>(null);
  protected readonly nota = signal('');
  protected readonly salvando = signal(false);
  protected readonly msg = signal<string | null>(null);

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.api.feedbacks().subscribe({
      next: (lista) => {
        this.feedbacks.set(lista);
        this.carregando.set(false);
        this.abrirDoLink();
      },
      error: () => this.carregando.set(false),
    });
  }

  /** O CTA do e-mail aponta para ?id=<id> — abre aquele card direto. */
  private abrirDoLink(): void {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id || this.selecionado()) return;
    const alvo = this.feedbacks().find((f) => f.id === id);
    if (alvo) this.abrir(alvo);
  }

  protected abrir(f: Feedback): void {
    this.selecionado.set(f);
    this.nota.set(f.notaInterna ?? '');
    this.msg.set(null);
  }

  protected fechar(): void {
    this.selecionado.set(null);
  }

  protected mudarStatus(f: Feedback, status: StatusFeedback): void {
    if (f.status === status) return;
    this.triar(f, { status }, `Marcado como ${this.rotuloStatus(status)}.`);
  }

  protected salvarNota(f: Feedback): void {
    this.triar(f, { notaInterna: this.nota() }, 'Nota salva.');
  }

  /** Aplica a mudança na lista e no card aberto, sem recarregar tudo. */
  private triar(f: Feedback, payload: Parameters<AdminApiService['triarFeedback']>[1], ok: string): void {
    this.salvando.set(true);
    this.api.triarFeedback(f.id, payload).subscribe({
      next: (atualizado) => {
        this.salvando.set(false);
        this.msg.set(ok);
        this.feedbacks.update((lista) => lista.map((x) => (x.id === atualizado.id ? atualizado : x)));
        this.selecionado.set(atualizado);
      },
      error: () => this.salvando.set(false),
    });
  }

  protected rotuloCategoria(c: CategoriaFeedback): string {
    return CATEGORIAS[c] ?? c;
  }

  protected rotuloStatus(s: StatusFeedback): string {
    return STATUS[s] ?? s;
  }

  protected data(iso: string): string {
    return formatarDataHora(iso);
  }
}
