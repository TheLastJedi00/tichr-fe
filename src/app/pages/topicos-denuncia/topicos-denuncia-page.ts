import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DenunciaApiService,
  TETO_PONTOS_DENUNCIA,
  TopicoDenuncia,
} from '../../core/denuncia-api.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Tópicos de denúncia do professor (spec 032): opções prontas que o aluno
 * escolhe ao denunciar (ex.: "Uso de celular em sala"), cada uma com a
 * pontuação que o professor costuma dar. Valem para todas as turmas. Remover
 * arquiva (as denúncias antigas continuam citando o tópico).
 */
@Component({
  selector: 'app-topicos-denuncia-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Card, Spinner],
  template: `
    <a class="voltar" routerLink="/configuracoes">← Configurações</a>
    <h1 class="title">Tópicos de denúncia</h1>
    <p class="sub">
      Seus alunos escolhem um destes tópicos ao denunciar um colega pelo portal. A pontuação sugerida
      já vem preenchida quando você valida, e você pode mudá-la na hora.
    </p>

    <app-card>
      <form class="novo" (ngSubmit)="criar()">
        <label class="campo campo--titulo">
          <span class="campo__lbl">Novo tópico</span>
          <input
            class="tichr-input"
            name="titulo"
            maxlength="80"
            placeholder="Ex.: Uso de celular em sala"
            [ngModel]="titulo()"
            (ngModelChange)="titulo.set($event)"
          />
        </label>
        <label class="campo campo--pts">
          <span class="campo__lbl">Pontos sugeridos</span>
          <input
            class="tichr-input"
            name="pontos"
            type="number"
            min="0"
            [max]="teto"
            step="100"
            [ngModel]="pontos()"
            (ngModelChange)="pontos.set(+$event || 0)"
          />
        </label>
        <button
          type="submit"
          class="btn-primary"
          [disabled]="titulo().trim().length < 3 || pontos() < 0 || pontos() > teto || salvando()"
        >
          Adicionar
        </button>
      </form>
    </app-card>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="28" /></div>
    } @else if (topicos().length) {
      <ul class="lista">
        @for (t of topicos(); track t.id) {
          <li class="item">
            <span class="item__titulo">{{ t.titulo }}</span>
            <span class="item__pts">{{ t.pontosSugeridos }} pts</span>
            <button type="button" class="btn-outline" [disabled]="salvando()" (click)="arquivar(t)">
              Remover
            </button>
          </li>
        }
      </ul>
    } @else {
      <p class="vazio">Nenhum tópico ainda. Sem tópicos, o aluno descreve a denúncia só com texto.</p>
    }
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); font-weight: 600; }
    .title { margin: 0; font-size: 1.6rem; font-weight: 800; }
    .sub { margin: 0.35rem 0 1rem; color: var(--text-muted); max-width: 60ch; }
    .loading { display: flex; justify-content: center; padding: 2rem 0; color: var(--primary); }
    .novo { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; }
    .campo { display: flex; flex-direction: column; gap: 0.35rem; }
    .campo--titulo { flex: 1 1 240px; }
    .campo--pts { flex: 0 1 150px; }
    .campo__lbl { font-weight: 700; font-size: 0.9rem; }
    .lista { list-style: none; margin: 1rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.9rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
    }
    .item__titulo { flex: 1; font-weight: 600; overflow-wrap: anywhere; }
    .item__pts { color: var(--primary); font-weight: 700; white-space: nowrap; }
    .vazio { color: var(--text-muted); margin-top: 1rem; }
  `,
})
export class TopicosDenunciaPage {
  private readonly api = inject(DenunciaApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly teto = TETO_PONTOS_DENUNCIA;
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly topicos = signal<TopicoDenuncia[]>([]);
  protected readonly titulo = signal('');
  protected readonly pontos = signal(1000);

  constructor() {
    this.carregar();
  }

  protected criar(): void {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.api
      .criarTopico({ titulo: this.titulo().trim(), pontosSugeridos: this.pontos() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.titulo.set('');
          this.salvando.set(false);
          this.carregar();
        },
        error: () => this.salvando.set(false),
      });
  }

  protected arquivar(t: TopicoDenuncia): void {
    this.salvando.set(true);
    this.api
      .editarTopico(t.id, { ativo: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.topicos.update((l) => l.filter((x) => x.id !== t.id));
        },
        error: () => this.salvando.set(false),
      });
  }

  private carregar(): void {
    this.api
      .listarTopicos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (l) => {
          this.topicos.set(l);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });
  }
}
