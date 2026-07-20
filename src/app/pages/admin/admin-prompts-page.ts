import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApiService } from '../../core/admin-api.service';
import { ConfigIaView, JogoIa, PromptIaView } from '../../core/models';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

const NOME_JOGO: Record<JogoIa, string> = {
  qlick: 'Tichr Qlick',
  wor: 'Tichr Wor',
  isolateus: 'Tichr Isolateus',
};

const TOKENS_JOGO: Record<JogoIa, string> = {
  qlick: '{contexto}, {instrucao}, {qtdPerguntas}, {qtdAlternativas}',
  wor: '{contexto}, {instrucao}, {qtdPalavras}, {qtdDicas}',
  isolateus: '{contexto}, {instrucao}, {qtdQuestoes}, {qtdAlternativas}',
};

/**
 * Governança de IA (backoffice): edita os prompts de cada jogo (salvos no banco,
 * sem novo deploy) e o limite global de gerações por dia. Espelha o padrão das
 * outras telas admin (cartões + signals + ações inline).
 */
@Component({
  selector: 'app-admin-prompts-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Icon, Spinner],
  template: `
    <span class="tag"><app-icon name="sparkles" [size]="14" /> Backoffice</span>
    <h1>Governança de IA</h1>
    <p class="sub">
      Ajuste os prompts que instruem a IA de cada jogo e o limite de gerações por
      dia — reflete na hora, sem novo deploy.
    </p>

    <app-card title="Limite de gerações por dia">
      <p class="muted">
        Máximo de gerações por IA que cada professor pode fazer por dia, por jogo.
      </p>
      @if (config(); as c) {
        <div class="limite">
          <input
            class="tichr-input"
            type="number"
            min="1"
            max="20"
            [value]="limiteEdit()"
            (input)="limiteEdit.set(+$any($event.target).value)"
          />
          <button class="btn-primary" [disabled]="salvandoLimite()" (click)="salvarLimite()">
            {{ salvandoLimite() ? 'Salvando…' : 'Salvar limite' }}
          </button>
          <span class="muted atual">Atual: {{ c.limiteGeracoesDia }}/dia</span>
        </div>
      } @else {
        <app-spinner [size]="20" />
      }
    </app-card>

    @if (carregando()) {
      <app-spinner [size]="28" />
    } @else {
      @for (p of prompts(); track p.jogo) {
        <app-card [title]="nome(p.jogo)">
          <div class="cab">
            @if (p.personalizado) {
              <span class="badge on">Personalizado</span>
            } @else {
              <span class="badge">Padrão</span>
            }
            <span class="muted tokens">Tokens: {{ tokens(p.jogo) }}</span>
          </div>
          <textarea
            class="tichr-input prompt"
            rows="10"
            [value]="rascunho()[p.jogo] ?? p.template"
            (input)="editar(p.jogo, $any($event.target).value)"
          ></textarea>
          <div class="acoes">
            <button class="btn-primary" [disabled]="salvando() === p.jogo" (click)="salvar(p.jogo)">
              {{ salvando() === p.jogo ? 'Salvando…' : 'Salvar prompt' }}
            </button>
            <button
              class="btn-outline"
              [disabled]="!p.personalizado || salvando() === p.jogo"
              (click)="restaurar(p.jogo)"
            >
              Restaurar padrão
            </button>
          </div>
        </app-card>
      }
    }

    @if (erro()) { <p class="erro">{{ erro() }}</p> }
  `,
  styles: `
    :host { display: block; }
    .tag { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 700; color: var(--primary); }
    h1 { margin: 0.4rem 0 0.25rem; font-size: 1.5rem; }
    .sub { color: var(--text-muted); margin: 0 0 1rem; }
    .muted { color: var(--text-muted); }
    .limite { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .limite .tichr-input { width: 6rem; }
    .atual { font-size: 0.9rem; }
    .cab { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .badge { font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid var(--border); color: var(--text-muted); }
    .badge.on { color: var(--primary); border-color: var(--primary); }
    .tokens { font-size: 0.78rem; }
    .prompt { width: 100%; font-family: ui-monospace, monospace; font-size: 0.82rem; resize: vertical; }
    .acoes { display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .erro { color: var(--danger); }
    app-card { display: block; margin-top: 1rem; }
  `,
})
export class AdminPromptsPage {
  private readonly api = inject(AdminApiService);

  protected readonly prompts = signal<PromptIaView[]>([]);
  protected readonly config = signal<ConfigIaView | null>(null);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal<JogoIa | null>(null);
  protected readonly salvandoLimite = signal(false);
  protected readonly limiteEdit = signal(1);
  protected readonly erro = signal<string | null>(null);
  /** Edições locais dos templates por jogo (antes de salvar). */
  protected readonly rascunho = signal<Partial<Record<JogoIa, string>>>({});

  constructor() {
    this.carregar();
    this.api.configIa().subscribe({
      next: (c) => {
        this.config.set(c);
        this.limiteEdit.set(c.limiteGeracoesDia);
      },
    });
  }

  protected nome(jogo: JogoIa): string {
    return NOME_JOGO[jogo];
  }
  protected tokens(jogo: JogoIa): string {
    return TOKENS_JOGO[jogo];
  }

  private carregar(): void {
    this.carregando.set(true);
    this.api.prompts().subscribe({
      next: (ps) => {
        this.prompts.set(ps);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os prompts.');
        this.carregando.set(false);
      },
    });
  }

  protected editar(jogo: JogoIa, valor: string): void {
    this.rascunho.update((r) => ({ ...r, [jogo]: valor }));
  }

  protected salvar(jogo: JogoIa): void {
    const template = this.rascunho()[jogo] ?? this.prompts().find((p) => p.jogo === jogo)?.template ?? '';
    if (template.trim().length < 20) {
      this.erro.set('O prompt precisa ter ao menos 20 caracteres.');
      return;
    }
    this.salvando.set(jogo);
    this.erro.set(null);
    this.api.salvarPrompt(jogo, template).subscribe({
      next: (view) => this.aplicar(view),
      error: () => {
        this.erro.set('Não foi possível salvar o prompt.');
        this.salvando.set(null);
      },
    });
  }

  protected restaurar(jogo: JogoIa): void {
    this.salvando.set(jogo);
    this.erro.set(null);
    this.api.restaurarPrompt(jogo).subscribe({
      next: (view) => {
        this.rascunho.update((r) => ({ ...r, [jogo]: undefined }));
        this.aplicar(view);
      },
      error: () => {
        this.erro.set('Não foi possível restaurar o prompt.');
        this.salvando.set(null);
      },
    });
  }

  private aplicar(view: PromptIaView): void {
    this.prompts.update((ps) => ps.map((p) => (p.jogo === view.jogo ? view : p)));
    this.salvando.set(null);
  }

  protected salvarLimite(): void {
    const valor = Math.max(1, Math.min(20, Math.floor(this.limiteEdit())));
    this.salvandoLimite.set(true);
    this.erro.set(null);
    this.api.definirLimiteIa(valor).subscribe({
      next: (c) => {
        this.config.set(c);
        this.limiteEdit.set(c.limiteGeracoesDia);
        this.salvandoLimite.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível salvar o limite.');
        this.salvandoLimite.set(false);
      },
    });
  }
}
