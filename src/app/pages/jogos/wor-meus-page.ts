import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorApiService } from '../../core/wor-api.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Turma, WorJogo } from '../../core/models';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

/** Lista das batalhas prontas do professor (arsenal salvo). */
@Component({
  selector: 'app-wor-meus-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner, Modal],
  template: `
    <a class="voltar" routerLink="/jogos/wor">‹ Tichr Wor</a>
    <header class="head">
      <h1>Minhas batalhas</h1>
      <a class="btn-primary novo" routerLink="/jogos/wor/novo">
        <app-icon name="plus" [size]="16" /> Nova batalha
      </a>
    </header>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <ul class="lista">
        @for (j of jogos(); track j.id) {
          <li class="card">
            <span class="card__ic"><app-icon name="castle" [size]="22" /></span>
            <div class="card__info">
              <strong>{{ j.nome }}</strong>
              <span class="card__meta">{{ j.topico }} · {{ j.palavras.length }} palavra(s)</span>
            </div>
            <div class="card__acoes">
              <button class="btn-primary" type="button" (click)="abrirRodar(j)">Rodar</button>
              <a class="btn-outline" [routerLink]="['/jogos/wor/editar', j.id]">Editar</a>
              <button class="btn-outline warn" type="button" (click)="remover(j)">Excluir</button>
            </div>
          </li>
        } @empty {
          <p class="vazio">Nenhuma batalha ainda. Forje a primeira!</p>
        }
      </ul>
    }

    @if (rodando(); as j) {
      <app-modal [open]="true" [title]="'Rodar: ' + j.nome" (close)="rodando.set(null)">
        <p class="modal-sub">Escolha a turma para a batalha:</p>
        <div class="turmas">
          @for (t of turmasList(); track t.id) {
            <button class="turma-btn" type="button" [disabled]="criando()" (click)="rodar(j, t)">
              {{ t.nome }}
            </button>
          } @empty {
            <p class="vazio">Você ainda não tem turmas ativas.</p>
          }
        </div>
      </app-modal>
    }
  `,
  styles: `
    :host { display: block; }
    .voltar { display: inline-block; margin-bottom: 0.75rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .head { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem; }
    .head h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
    .novo { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .card { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .card__ic { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; color: #b45309; background: color-mix(in srgb, #b45309 12%, transparent); }
    .card__info { display: flex; flex-direction: column; gap: 0.2rem; }
    .card__info strong { font-size: 1.05rem; }
    .card__meta { font-size: 0.85rem; color: var(--text-muted); }
    .card__acoes { display: flex; gap: 0.5rem; }
    .card__acoes .btn-outline { text-decoration: none; }
    .btn-outline.warn { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); }
    .vazio { color: var(--text-muted); text-align: center; padding: 1.5rem; }
    .modal-sub { margin: 0 0 0.75rem; color: var(--text-muted); }
    .turmas { display: flex; flex-direction: column; gap: 0.5rem; }
    .turma-btn { padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); font-weight: 700; text-align: left; cursor: pointer; }
    .turma-btn:hover { border-color: #b45309; }
    @media (min-width: 560px) {
      .head { flex-direction: row; align-items: center; justify-content: space-between; }
      .card { flex-direction: row; align-items: center; }
      .card__info { flex: 1; }
    }
  `,
})
export class WorMeusPage {
  private readonly api = inject(WorApiService);
  private readonly turmas = inject(TurmaApiService);
  private readonly router = inject(Router);

  protected readonly jogos = signal<WorJogo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly rodando = signal<WorJogo | null>(null);
  protected readonly turmasList = signal<Turma[]>([]);
  protected readonly criando = signal(false);

  constructor() {
    this.carregar();
  }

  protected abrirRodar(j: WorJogo): void {
    this.rodando.set(j);
    this.turmas.getTurmas().subscribe((ts) =>
      this.turmasList.set(ts.filter((t) => !t.encerradaManualmente)),
    );
  }

  protected rodar(j: WorJogo, t: Turma): void {
    this.criando.set(true);
    this.api.criarPartida(j.id, t.id).subscribe({
      next: (v) => this.router.navigate(['/jogos/wor/partida', v.match.id]),
      error: () => this.criando.set(false),
    });
  }

  private carregar(): void {
    this.carregando.set(true);
    this.api.listarJogos().subscribe({
      next: (j) => {
        this.jogos.set(j);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected remover(j: WorJogo): void {
    if (!confirm(`Excluir a batalha "${j.nome}"?`)) return;
    this.api.removerJogo(j.id).subscribe(() => this.carregar());
  }
}
