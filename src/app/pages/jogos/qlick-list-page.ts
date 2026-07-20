import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Qlick, Turma } from '../../core/models';
import { REGRAS_JOGO } from '../../core/regras-jogo.data';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { PinsModal } from '../../ui/pins-modal/pins-modal';
import { PreJogoAlunosModal } from '../../ui/pre-jogo-alunos-modal/pre-jogo-alunos-modal';
import { RegrasJogoView } from '../../ui/regras-jogo/regras-jogo';
import { Skeleton } from '../../ui/skeleton/skeleton';

/** Meus Qlicks (PhD): lista dos questionários, com criar, editar e rodar. */
@Component({
  selector: 'app-qlick-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, Skeleton, PinsModal, Modal, RegrasJogoView, PreJogoAlunosModal],
  template: `
    <header class="head">
      <div>
        <a class="voltar" routerLink="/jogos">← Jogos</a>
        <h1 class="title">Meus Qlicks</h1>
      </div>
      <div class="head__acoes">
        <button class="btn-outline regras-btn" type="button" (click)="regrasAberto.set(true)">
          <app-icon name="info" [size]="16" /> Regras e Pontuações
        </button>
        <button class="btn-outline pins" type="button" (click)="pinsAberto.set(true)">
          <app-icon name="users" [size]="16" /> PINs da turma
        </button>
        <a class="btn-primary" routerLink="/jogos/qlick/novo">
          <app-icon name="plus" [size]="16" /> Novo Qlick
        </a>
      </div>
    </header>

    <app-modal [open]="regrasAberto()" title="Tichr Qlick — Regras e Pontuações" (close)="regrasAberto.set(false)">
      <app-regras-jogo [regras]="regras" />
      <div modal-actions>
        <button class="btn-primary" type="button" (click)="regrasAberto.set(false)">Fechar</button>
      </div>
    </app-modal>

    @if (carregando()) {
      <div class="lista">
        @for (i of [1, 2, 3]; track i) {
          <app-card>
            <div class="sk-item">
              <div class="sk-item__info">
                <app-skeleton width="50%" height="1.05rem" />
                <app-skeleton width="70%" height="0.85rem" />
              </div>
              <app-skeleton width="84px" height="2rem" radius="10px" />
            </div>
          </app-card>
        }
      </div>
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

    <app-modal
      [open]="escolhaTurma() !== null"
      title="Para qual turma?"
      (close)="rodando() || escolhaTurma.set(null)"
    >
      <p class="muted">Este Qlick está em várias turmas. Escolha para qual rodar:</p>
      <div class="pick-turmas">
        @for (id of turmasDaEscolha(); track id) {
          <button class="pick-turma" type="button" [disabled]="rodando()" (click)="escolher(id)">
            {{ nomeTurma(id) }}
          </button>
        }
      </div>
      <div modal-actions>
        <button class="btn-outline" type="button" [disabled]="rodando()" (click)="escolhaTurma.set(null)">
          Cancelar
        </button>
      </div>
    </app-modal>

    <app-pre-jogo-alunos-modal
      [open]="!!rosterPendente()"
      [turmaId]="rosterPendente()?.turmaId ?? null"
      [nomeTurma]="rosterPendente()?.nome ?? ''"
      (adicionados)="aposCadastroPreJogo()"
      (fechar)="cancelarPreJogo()"
    />
  `,
  styles: `
    .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .head__acoes { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .voltar { color: var(--primary); font-weight: 600; }
    .title { margin: 0.35rem 0 0; font-size: 1.5rem; font-weight: 700; }
    .btn-primary, .pins { text-decoration: none; }
    .pins, .regras-btn { display: inline-flex; align-items: center; gap: 0.4rem; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0; }
    .lista { display: flex; flex-direction: column; gap: 0.75rem; }
    .sk-item { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .sk-item__info { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
    .item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .item__tit { display: block; font-size: 1.05rem; }
    .item__meta { color: var(--text-muted); font-size: 0.85rem; }
    .item__acoes { display: flex; gap: 0.5rem; }
    .btn-sm { font-size: 0.85rem; padding: 0.4rem 0.8rem; text-decoration: none; }
    .pick-turmas { display: grid; gap: 0.5rem; }
    .pick-turma {
      font: inherit; font-weight: 700; text-align: left; cursor: pointer;
      padding: 0.7rem 0.9rem; border-radius: 12px;
      border: 1px solid var(--border); background: var(--surface); color: inherit;
    }
    .pick-turma:hover:not(:disabled) { border-color: var(--primary); }
  `,
})
export class QlickListPage {
  private readonly api = inject(TurmaApiService);
  private readonly router = inject(Router);
  protected readonly carregando = signal(true);
  protected readonly rodando = signal(false);
  protected readonly qlicks = signal<Qlick[]>([]);
  protected readonly pinsAberto = signal(false);
  /** Guia de consulta rápida durante a aula (regras + tabela de XP). */
  protected readonly regrasAberto = signal(false);
  protected readonly regras = REGRAS_JOGO.QLICK;
  protected readonly turmas = signal<Turma[]>([]);
  /** Qlick aguardando a escolha de turma (quando tem várias atribuídas). */
  protected readonly escolhaTurma = signal<Qlick | null>(null);
  /** Partida aguardando cadastro de alunos (pré-jogo, ENH-003). */
  protected readonly rosterPendente = signal<{
    qlickId: string;
    turmaId: string;
    nome: string;
  } | null>(null);

  constructor() {
    this.api.getQlicks().subscribe({
      next: (q) => {
        this.qlicks.set(q);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
    this.api.getTurmas().subscribe((t) => this.turmas.set(t));
  }

  /** IDs das turmas atribuídas ao Qlick (N:N + legado). */
  private turmasDoQlick(q: Qlick): string[] {
    const ids = [...(q.turmaIds ?? [])];
    if (q.turmaId && !ids.includes(q.turmaId)) ids.push(q.turmaId);
    return ids;
  }

  protected nomeTurma(id: string): string {
    return this.turmas().find((t) => t.id === id)?.nome ?? 'Turma';
  }

  protected turmasDaEscolha(): string[] {
    const q = this.escolhaTurma();
    return q ? this.turmasDoQlick(q) : [];
  }

  /** Rodar: se o Qlick tem várias turmas, pergunta "para qual turma?". */
  protected rodar(q: Qlick): void {
    const turmas = this.turmasDoQlick(q);
    if (turmas.length > 1) {
      this.escolhaTurma.set(q);
      return;
    }
    this.iniciarPartida(q.id, turmas[0]);
  }

  protected escolher(turmaId: string): void {
    const q = this.escolhaTurma();
    if (q) this.iniciarPartida(q.id, turmaId);
  }

  private iniciarPartida(qlickId: string, turmaId?: string): void {
    // ENH-003: se a turma escolhida não tem alunos, cadastra em massa antes.
    if (turmaId) {
      this.rodando.set(true);
      this.api.getAlunos(turmaId).subscribe({
        next: (alunos) => {
          if (alunos.length === 0) {
            this.rodando.set(false);
            this.escolhaTurma.set(null);
            this.rosterPendente.set({
              qlickId,
              turmaId,
              nome: this.nomeTurma(turmaId),
            });
            return;
          }
          this.criarPartida(qlickId, turmaId);
        },
        // Falha ao checar o roster não deve travar: tenta criar mesmo assim.
        error: () => this.criarPartida(qlickId, turmaId),
      });
      return;
    }
    this.criarPartida(qlickId, turmaId);
  }

  private criarPartida(qlickId: string, turmaId?: string): void {
    this.rodando.set(true);
    this.api.criarPartida(qlickId, turmaId).subscribe({
      next: (p) => this.router.navigate(['/jogos/qlick/partida', p.id]),
      error: () => this.rodando.set(false),
    });
  }

  /** Alunos cadastrados no pré-jogo → segue para a partida pendente. */
  protected aposCadastroPreJogo(): void {
    const pend = this.rosterPendente();
    this.rosterPendente.set(null);
    if (pend) this.criarPartida(pend.qlickId, pend.turmaId);
  }

  protected cancelarPreJogo(): void {
    this.rosterPendente.set(null);
  }
}
