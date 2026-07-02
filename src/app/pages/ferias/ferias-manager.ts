import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { formatarData } from '../../core/date-format';
import { Ferias } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Gestor de períodos de férias. Sem [turmaId] gerencia as férias globais do
 * professor; com [turmaId], as férias específicas daquela turma.
 */
@Component({
  selector: 'app-ferias-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Spinner],
  template: `
    <app-card [title]="turmaId() ? 'Férias desta turma' : 'Meus períodos de férias'">
      @if (carregando()) {
        <div class="loading"><app-spinner [size]="24" /></div>
      } @else {
        @if (lista().length) {
          <ul class="lista">
            @for (f of lista(); track f.id) {
              <li class="item">
                <span>{{ formatarData(f.dataInicio) }} → {{ formatarData(f.dataFim) }}</span>
                <button type="button" class="rm" (click)="remover(f.id)" aria-label="Remover">×</button>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">Nenhum período de férias cadastrado.</p>
        }

        <div class="add">
          <label>
            <span class="lbl">De</span>
            <input class="tichr-input" type="date" [value]="de()" (input)="de.set($any($event.target).value)" />
          </label>
          <label>
            <span class="lbl">Até</span>
            <input class="tichr-input" type="date" [value]="ate()" (input)="ate.set($any($event.target).value)" />
          </label>
          <button class="btn-primary" type="button" [disabled]="!podeAdicionar() || salvando()" (click)="adicionar()">
            {{ salvando() ? 'Salvando…' : 'Adicionar' }}
          </button>
        </div>
      }
    </app-card>
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 1rem 0; color: var(--primary); }
    .lista { list-style: none; margin: 0 0 1rem; padding: 0; }
    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-weight: 500;
    }
    .item + .item { border-top: 1px solid var(--border); }
    .rm {
      border: none;
      background: none;
      color: var(--danger);
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }
    .muted { color: var(--text-muted); margin: 0 0 1rem; }
    .add {
      display: flex;
      align-items: flex-end;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .add label { display: flex; flex-direction: column; gap: 0.25rem; }
    .lbl { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
  `,
})
export class FeriasManager {
  private readonly api = inject(TurmaApiService);
  readonly turmaId = input<string | undefined>(undefined);

  protected readonly formatarData = formatarData;
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly lista = signal<Ferias[]>([]);
  protected readonly de = signal('');
  protected readonly ate = signal('');

  constructor() {
    this.carregar();
  }

  protected podeAdicionar(): boolean {
    return !!this.de() && !!this.ate() && this.de() <= this.ate();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.api.getFerias().subscribe({
      next: (todas) => {
        const alvo = this.turmaId();
        this.lista.set(
          todas.filter((f) => (alvo ? f.turmaId === alvo : !f.turmaId)),
        );
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected adicionar(): void {
    if (!this.podeAdicionar()) return;
    this.salvando.set(true);
    this.api
      .criarFerias({
        dataInicio: this.de(),
        dataFim: this.ate(),
        ...(this.turmaId() ? { turmaId: this.turmaId() } : {}),
      })
      .subscribe({
        next: () => {
          this.de.set('');
          this.ate.set('');
          this.salvando.set(false);
          this.carregar();
        },
        error: () => this.salvando.set(false),
      });
  }

  protected remover(id: string): void {
    this.api.removerFerias(id).subscribe({ next: () => this.carregar() });
  }
}
