import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { Aluno, Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Modal } from '../modal/modal';
import { Spinner } from '../spinner/spinner';

/**
 * Modal de consulta rápida de PINs (dumb-ish): lista as turmas do professor e,
 * ao escolher uma, mostra o PIN da turma e o PIN de cada aluno — para repassar
 * o acesso sem sair da página onde o modal foi aberto (ex.: o estúdio do Qlick).
 */
@Component({
  selector: 'app-pins-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Spinner],
  template: `
    <app-modal
      [open]="aberto"
      [title]="selecionada() ? selecionada()!.nome : 'PINs de acesso'"
      (close)="fechar()"
    >
      @if (carregando()) {
        <div class="loading"><app-spinner [size]="28" /></div>
      } @else if (selecionada(); as t) {
        <button class="voltar" type="button" (click)="selecionada.set(null)">← Turmas</button>
        <div class="pinturma">
          <span class="pinturma__lbl">PIN da turma</span>
          <strong class="pinturma__val">{{ t.pinTurma || '—' }}</strong>
        </div>
        @if (alunos().length === 0) {
          <p class="muted">Nenhum aluno cadastrado nesta turma.</p>
        } @else {
          <span class="secao">PINs dos alunos</span>
          <ul class="alunos">
            @for (a of alunos(); track a.id) {
              <li class="aluno">
                <span class="aluno__nome">{{ a.nome }}</span>
                <span class="aluno__pin">{{ a.pinAcesso || '—' }}</span>
              </li>
            }
          </ul>
        }
      } @else if (turmas().length === 0) {
        <p class="muted">Você ainda não tem turmas cadastradas.</p>
      } @else {
        <p class="muted">Escolha a turma para ver o PIN dela e o de cada aluno.</p>
        <ul class="turmas">
          @for (t of turmas(); track t.id) {
            <li>
              <button class="turma" type="button" (click)="abrirTurma(t)">
                @if (t.cor) { <span class="dot" [style.background]="t.cor"></span> }
                <span class="turma__nome">{{ t.nome }}</span>
                <span class="seta">→</span>
              </button>
            </li>
          }
        </ul>
      }
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="fechar()">Fechar</button>
      </div>
    </app-modal>
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 1.5rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0.25rem 0 0; }
    .voltar { background: none; border: none; padding: 0 0 0.5rem; color: var(--primary); font-weight: 600; cursor: pointer; }
    .turmas { list-style: none; margin: 0.75rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .turma { width: 100%; display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 0.85rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); font-weight: 600; cursor: pointer; text-align: left; }
    .turma:hover { border-color: var(--primary); }
    .turma__nome { flex: 1; min-width: 0; }
    .dot { width: 10px; height: 10px; border-radius: 999px; flex: 0 0 auto; }
    .seta { color: var(--text-muted); font-weight: 800; }
    .pinturma { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0.9rem; border-radius: 12px; background: color-mix(in srgb, var(--primary) 10%, transparent); margin-bottom: 1rem; }
    .pinturma__lbl { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
    .pinturma__val { font-size: 1.4rem; font-variant-numeric: tabular-nums; letter-spacing: 0.12em; color: var(--primary); }
    .secao { display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.4rem; }
    .alunos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; max-height: 45vh; overflow-y: auto; }
    .aluno { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.5rem 0.7rem; border-radius: 10px; background: var(--surface-alt); }
    .aluno__nome { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .aluno__pin { font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: 0.1em; color: var(--primary); }
  `,
})
export class PinsModal {
  private readonly api = inject(TurmaApiService);

  protected readonly carregando = signal(false);
  protected readonly turmas = signal<Turma[]>([]);
  protected readonly selecionada = signal<Turma | null>(null);
  protected readonly alunos = signal<Aluno[]>([]);
  protected aberto = false;
  private carregou = false;

  /** Carrega as turmas na primeira abertura. */
  @Input() set open(v: boolean) {
    this.aberto = v;
    if (v && !this.carregou) {
      this.carregou = true;
      this.carregando.set(true);
      this.api.getTurmas().subscribe({
        next: (t) => {
          this.turmas.set(t);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });
    }
  }

  @Output() close = new EventEmitter<void>();

  /** Abre uma turma: busca o PIN (com backfill) e os alunos. */
  protected abrirTurma(t: Turma): void {
    this.selecionada.set(t);
    this.carregando.set(true);
    forkJoin({
      turma: this.api.getTurma(t.id),
      alunos: this.api.getAlunos(t.id),
    }).subscribe({
      next: ({ turma, alunos }) => {
        this.selecionada.set(turma);
        this.alunos.set(alunos);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected fechar(): void {
    this.selecionada.set(null);
    this.close.emit();
  }
}
