import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Qlick } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { PinsModal } from '../../ui/pins-modal/pins-modal';
import { Spinner } from '../../ui/spinner/spinner';

/** Meus Qlicks (PhD): lista dos questionários, com criar, editar e rodar. */
@Component({
  selector: 'app-qlick-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, Spinner, PinsModal],
  template: `
    <header class="head">
      <div>
        <a class="voltar" routerLink="/jogos/qlick">← Tichr Qlick</a>
        <h1 class="title">Meus Qlicks</h1>
      </div>
      <div class="head__acoes">
        <button class="btn-outline pins" type="button" (click)="pinsAberto.set(true)">
          <app-icon name="users" [size]="16" /> PINs da turma
        </button>
        <a class="btn-primary" routerLink="/jogos/qlick/novo">
          <app-icon name="plus" [size]="16" /> Novo Qlick
        </a>
      </div>
    </header>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (qlicks().length === 0) {
      <app-card><p class="muted">Você ainda não criou nenhum Qlick.</p></app-card>
    } @else {
      <div class="lista">
        @for (q of qlicks(); track q.id) {
          <app-card>
            <div class="item">
              <div class="item__info">
                <strong class="item__tit">{{ q.titulo }}</strong>
                <span class="item__meta">
                  {{ q.perguntas.length }} perguntas · {{ q.duracaoSegundos }}s/questão
                  @if (q.disciplina) { · {{ q.disciplina }} }
                </span>
              </div>
              <div class="item__acoes">
                <a class="btn-outline btn-sm" [routerLink]="['/jogos/qlick/editar', q.id]">Editar</a>
                <button class="btn-primary btn-sm" type="button" [disabled]="rodando()" (click)="rodar(q)">
                  Rodar
                </button>
              </div>
            </div>
          </app-card>
        }
      </div>
    }

    <app-pins-modal [open]="pinsAberto()" (close)="pinsAberto.set(false)" />
  `,
  styles: `
    .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .head__acoes { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .voltar { color: var(--primary); font-weight: 600; }
    .title { margin: 0.35rem 0 0; font-size: 1.5rem; font-weight: 700; }
    .btn-primary, .pins { text-decoration: none; }
    .pins { display: inline-flex; align-items: center; gap: 0.4rem; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0; }
    .lista { display: flex; flex-direction: column; gap: 0.75rem; }
    .item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .item__tit { display: block; font-size: 1.05rem; }
    .item__meta { color: var(--text-muted); font-size: 0.85rem; }
    .item__acoes { display: flex; gap: 0.5rem; }
    .btn-sm { font-size: 0.85rem; padding: 0.4rem 0.8rem; text-decoration: none; }
  `,
})
export class QlickListPage {
  private readonly api = inject(TurmaApiService);
  private readonly router = inject(Router);
  protected readonly carregando = signal(true);
  protected readonly rodando = signal(false);
  protected readonly qlicks = signal<Qlick[]>([]);
  protected readonly pinsAberto = signal(false);

  constructor() {
    this.api.getQlicks().subscribe({
      next: (q) => {
        this.qlicks.set(q);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  /** Cria a partida (lobby) e vai para a sala do professor. */
  protected rodar(q: Qlick): void {
    this.rodando.set(true);
    this.api.criarPartida(q.id).subscribe({
      next: (p) => this.router.navigate(['/jogos/qlick/partida', p.id]),
      error: () => this.rodando.set(false),
    });
  }
}
