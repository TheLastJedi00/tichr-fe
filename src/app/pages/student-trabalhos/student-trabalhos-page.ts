import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  EstadoEntrega,
  faltaParaPrazo,
  formatarNota,
  formatarPrazo,
  TrabalhoApiService,
  TrabalhoDoAluno,
} from '../../core/trabalho-api.service';
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

/**
 * Trabalhos (spec 038), no portal do aluno: as atividades da turma com o
 * estado da minha entrega. Só o aluno e o professor veem a entrega.
 */
@Component({
  selector: 'app-student-trabalhos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner],
  template: `
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
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .vazio { color: var(--text-muted); }
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

  protected readonly selo = selo;
  protected readonly prazo = formatarPrazo;
  protected readonly falta = (iso: string) => faltaParaPrazo(iso);

  protected readonly carregando = signal(true);
  protected readonly trabalhos = signal<TrabalhoDoAluno[]>([]);
  /** Professor fora do PhD (403): o recurso não existe para esta turma. */
  protected readonly bloqueado = signal(false);

  constructor() {
    this.carregar();
  }

  protected abrir(_atividadeId: string): void {
    // A tela da atividade (canva e arquivos) entra na próxima task.
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
