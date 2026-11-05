import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { formatarData } from '../../core/date-format';
import {
  DenunciaApiService,
  DenunciaProfessor,
  TETO_PONTOS_DENUNCIA,
} from '../../core/denuncia-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Aba "Denúncias" do detalhe da turma (spec 032). Smart: carrega e resolve as
 * denúncias da turma. Validar transfere XP do denunciado para quem denunciou
 * (no máximo o que o denunciado tem); invalidar só arquiva. A foto, se houver,
 * abre por um link temporário e é apagada quando a denúncia é resolvida.
 */
@Component({
  selector: 'app-turma-denuncias',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Card, Icon, Modal, Spinner],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="28" /></div>
    } @else {
      @if (pendentes().length === 0) {
        <app-card><p class="muted">Nenhuma denúncia aguardando você.</p></app-card>
      }
      <div class="lista">
        @for (d of pendentes(); track d.id) {
          <app-card>
            <div class="den">
              <div class="den__top">
                <span><strong>{{ d.autorNome }}</strong> denunciou <strong>{{ d.denunciadoNome }}</strong></span>
                <span class="den__data">{{ data(d.criadaEm) }}</span>
              </div>
              @if (d.topicoTitulo) {
                <span class="den__topico">{{ d.topicoTitulo }}</span>
              }
              @if (d.texto) {
                <p class="den__texto">{{ d.texto }}</p>
              }
              <div class="den__acoes">
                @if (d.temImagem) {
                  <button type="button" class="btn-outline" (click)="verFoto(d)">
                    <app-icon name="eye" [size]="16" /> Ver foto
                  </button>
                }
                <button type="button" class="btn-outline" [disabled]="ocupado()" (click)="invalidar(d)">
                  Invalidar
                </button>
                <button type="button" class="btn-primary" [disabled]="ocupado()" (click)="abrirValidar(d)">
                  Validar
                </button>
              </div>
            </div>
          </app-card>
        }
      </div>

      @if (resolvidas().length) {
        <button type="button" class="historico" (click)="verHistorico.set(!verHistorico())">
          {{ verHistorico() ? 'Esconder' : 'Ver' }} resolvidas ({{ resolvidas().length }})
        </button>
        @if (verHistorico()) {
          <ul class="hist">
            @for (d of resolvidas(); track d.id) {
              <li class="hist__item">
                <span>
                  <strong>{{ d.autorNome }}</strong> → <strong>{{ d.denunciadoNome }}</strong>
                  @if (d.topicoTitulo) { · {{ d.topicoTitulo }} }
                </span>
                <span class="hist__res" [attr.data-status]="d.status">
                  @if (d.status === 'VALIDADA') {
                    Validada · {{ d.pontosTransferidos ?? 0 }} {{ nomePontuacao() }}
                  } @else {
                    Invalidada
                  }
                </span>
              </li>
            }
          </ul>
        }
      }
    }

    <app-modal [open]="!!validando()" title="Validar denúncia" (close)="validando.set(null)">
      @if (validando(); as d) {
        <div class="val">
          @if (pontuacaoAtiva()) {
            <label class="campo">
              <span class="campo__lbl">Quantos {{ nomePontuacao() }} {{ d.autorNome }} recebe?</span>
              <input
                class="tichr-input"
                type="number"
                min="0"
                [max]="teto"
                step="100"
                [ngModel]="pontos()"
                (ngModelChange)="pontos.set(+$event || 0)"
              />
            </label>
            <p class="val__resumo">
              {{ d.denunciadoNome }} perde {{ transferencia() }} e {{ d.autorNome }} ganha {{ transferencia() }}.
            </p>
            @if (pontos() > d.xpDenunciado) {
              <p class="val__aviso">
                <app-icon name="alert" [size]="16" />
                {{ d.denunciadoNome }} tem só {{ d.xpDenunciado }} {{ nomePontuacao() }}: a transferência fica limitada a isso.
              </p>
            }
            @if (pontos() > teto) {
              <p class="val__aviso">O máximo por denúncia é {{ teto }}.</p>
            }
          } @else {
            <p class="val__resumo">
              A pontuação está desligada nesta turma: validar só registra a denúncia, sem mexer em pontos.
            </p>
          }
        </div>
      }
      <div modal-actions>
        <button type="button" class="btn-outline" (click)="validando.set(null)">Cancelar</button>
        <button
          type="button"
          class="btn-primary"
          [disabled]="ocupado() || pontos() < 0 || pontos() > teto"
          (click)="confirmarValidar()"
        >
          Validar
        </button>
      </div>
    </app-modal>

    <app-modal [open]="!!fotoUrl()" title="Foto da denúncia" (close)="fotoUrl.set(null)">
      @if (fotoUrl(); as url) {
        <img class="foto" [src]="url" alt="Foto anexada pelo aluno" />
      }
      <div modal-actions>
        <button type="button" class="btn-outline" (click)="fotoUrl.set(null)">Fechar</button>
      </div>
    </app-modal>
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 2rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0; }
    .lista { display: flex; flex-direction: column; gap: 0.6rem; }
    .den { display: flex; flex-direction: column; gap: 0.4rem; }
    .den__top { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .den__data { font-size: 0.8rem; color: var(--text-muted); }
    .den__topico { align-self: flex-start; font-size: 0.8rem; font-weight: 700; color: var(--primary); border: 1px solid var(--primary); border-radius: 999px; padding: 0.1rem 0.55rem; }
    .den__texto { margin: 0; overflow-wrap: anywhere; }
    .den__acoes { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; margin-top: 0.25rem; }
    .den__acoes button { display: inline-flex; align-items: center; gap: 0.35rem; }
    .historico { margin-top: 1rem; background: none; border: none; color: var(--primary); font: inherit; font-weight: 700; cursor: pointer; padding: 0; }
    .hist { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .hist__item { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; font-size: 0.9rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
    .hist__res { font-weight: 700; color: var(--text-muted); }
    .hist__res[data-status='VALIDADA'] { color: var(--success); }
    .val { display: flex; flex-direction: column; gap: 0.75rem; }
    .campo { display: flex; flex-direction: column; gap: 0.35rem; }
    .campo__lbl { font-weight: 700; }
    .val__resumo { margin: 0; }
    .val__aviso { display: flex; gap: 0.4rem; align-items: flex-start; margin: 0; color: var(--warning); font-weight: 600; font-size: 0.9rem; }
    .foto { max-width: 100%; max-height: 70vh; border-radius: 10px; display: block; margin: 0 auto; }
  `,
})
export class TurmaDenuncias implements OnInit {
  private readonly api = inject(DenunciaApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly turmaId = input.required<string>();
  readonly pontuacaoAtiva = input(true);
  readonly nomePontuacao = input('XP');
  /** Quantas pendentes sobraram (o badge da aba acompanha). */
  readonly pendentesMudou = output<number>();

  protected readonly teto = TETO_PONTOS_DENUNCIA;
  protected readonly carregando = signal(true);
  protected readonly ocupado = signal(false);
  private readonly todas = signal<DenunciaProfessor[]>([]);
  protected readonly pendentes = computed(() => this.todas().filter((d) => d.status === 'PENDENTE'));
  protected readonly resolvidas = computed(() => this.todas().filter((d) => d.status !== 'PENDENTE'));
  protected readonly verHistorico = signal(false);
  protected readonly validando = signal<DenunciaProfessor | null>(null);
  protected readonly pontos = signal(0);
  protected readonly fotoUrl = signal<string | null>(null);

  protected readonly transferencia = computed(() => {
    const d = this.validando();
    if (!d) return 0;
    return Math.max(0, Math.min(this.pontos(), d.xpDenunciado));
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected data(iso: string): string {
    return formatarData(iso.slice(0, 10));
  }

  protected abrirValidar(d: DenunciaProfessor): void {
    this.pontos.set(d.pontosSugeridos ?? 0);
    this.validando.set(d);
  }

  protected confirmarValidar(): void {
    const d = this.validando();
    if (!d || this.ocupado()) return;
    this.ocupado.set(true);
    this.api
      .validar(this.turmaId(), d.id, this.pontuacaoAtiva() ? this.pontos() : 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.validando.set(null);
          this.ocupado.set(false);
          this.carregar();
        },
        error: () => this.ocupado.set(false),
      });
  }

  protected invalidar(d: DenunciaProfessor): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.api
      .invalidar(this.turmaId(), d.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.carregar();
        },
        error: () => this.ocupado.set(false),
      });
  }

  protected verFoto(d: DenunciaProfessor): void {
    this.api
      .urlImagem(this.turmaId(), d.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: ({ url }) => this.fotoUrl.set(url) });
  }

  private carregar(): void {
    this.api
      .listarDaTurma(this.turmaId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (l) => {
          this.todas.set(l);
          this.carregando.set(false);
          this.pendentesMudou.emit(this.pendentes().length);
        },
        error: () => this.carregando.set(false),
      });
  }
}
