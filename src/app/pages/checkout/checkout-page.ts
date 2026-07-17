import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  IniciarCheckout,
  MetodoPagamento,
  PlanoAtual,
} from '../../core/models';
import { NOME_PLANO, PLANO_PENDENTE_KEY } from '../../core/plano.util';
import { PLANOS } from '../../core/planos.data';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

type TipoCheckout = 'upgrade' | 'slot';

/**
 * Tela de pagamento (smart). Recebe `?tipo=upgrade&plano=X` ou `?tipo=slot`,
 * deixa o professor escolher PIX ou cartão, e conduz o pagamento:
 * - PIX: QR + copia-e-cola inline, com polling de status até aprovar;
 * - Cartão: redireciona para o checkout hospedado do gateway.
 * Admin e destino gratuito são concedidos na hora (sem cobrança).
 */
@Component({
  selector: 'app-checkout-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Spinner, Icon],
  template: `
    <a class="voltar" routerLink="/planos">‹ Planos</a>
    <h1 class="title">{{ titulo() }}</h1>

    @if (concedido()) {
      <app-card>
        <div class="ok">
          <app-icon name="check" [size]="40" />
          <strong>Tudo certo!</strong>
          <p>{{ tipo() === 'slot' ? 'Sua vaga avulsa foi liberada.' : 'Seu plano está ativo.' }}</p>
          <a class="btn-primary" routerLink="/dashboard">Ir para o painel</a>
        </div>
      </app-card>
    } @else if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (cobranca(); as c) {
      @if (c.metodo === 'PIX') {
        <app-card>
          <div class="pix">
            <p class="pix__valor">{{ valorFmt() }}</p>
            @if (qrSrc(); as src) {
              <img class="pix__qr" [src]="src" alt="QR Code para pagamento PIX" />
            }
            <p class="pix__hint">Abra o app do seu banco, escaneie o QR ou use o copia-e-cola:</p>
            <div class="pix__code">
              <code>{{ c.brCode }}</code>
              <button class="btn-outline" type="button" (click)="copiar(c.brCode!)">
                {{ copiado() ? 'Copiado!' : 'Copiar' }}
              </button>
            </div>
            <p class="pix__status">
              <app-spinner [size]="16" /> Aguardando confirmação do pagamento…
            </p>
            @if (mostrarSimular) {
              <button class="btn-outline simular" type="button" (click)="simular()">
                Simular pagamento (teste)
              </button>
            }
          </div>
        </app-card>
      } @else {
        <app-card>
          <div class="cartao">
            <app-spinner [size]="24" />
            <p>Redirecionando para o pagamento seguro…</p>
          </div>
        </app-card>
      }
    } @else if (expirado()) {
      <app-card>
        <div class="erro">
          <strong>A cobrança expirou.</strong>
          <p>Gere uma nova para concluir o pagamento.</p>
          <button class="btn-primary" type="button" (click)="reiniciar()">Gerar nova cobrança</button>
        </div>
      </app-card>
    } @else {
      <app-card>
        <div class="metodo">
          <p class="metodo__resumo">
            {{ tipo() === 'slot' ? 'Vaga de turma avulsa' : 'Plano ' + nomePlanoAlvo() }}
            <strong>{{ valorFmt() }}</strong>
          </p>
          <p class="metodo__label">Como você quer pagar?</p>
          <div class="metodo__opcoes">
            <button
              class="metodo__btn"
              type="button"
              [disabled]="iniciando()"
              (click)="iniciar('PIX')"
            >
              <app-icon name="sparkles" [size]="20" />
              <span>PIX</span>
              <small>Na hora</small>
            </button>
            <button
              class="metodo__btn"
              type="button"
              [disabled]="iniciando()"
              (click)="iniciar('CARTAO')"
            >
              <app-icon name="book" [size]="20" />
              <span>Cartão</span>
              <small>Crédito</small>
            </button>
          </div>
          @if (iniciando()) {
            <p class="metodo__loading"><app-spinner [size]="16" /> Gerando cobrança…</p>
          }
          @if (erro(); as e) {
            <p class="metodo__erro">{{ e }}</p>
          }
        </div>
      </app-card>
    }
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .voltar:hover { color: var(--primary); }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .metodo__resumo { display: flex; justify-content: space-between; gap: 1rem; margin: 0 0 1rem; font-weight: 600; }
    .metodo__label { margin: 0 0 0.6rem; color: var(--text-muted); }
    .metodo__opcoes { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .metodo__btn {
      display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
      padding: 1rem; border: 2px solid var(--border); border-radius: 12px;
      background: var(--surface); color: var(--text); cursor: pointer; font: inherit;
    }
    .metodo__btn:hover:not(:disabled) { border-color: var(--primary); }
    .metodo__btn:disabled { opacity: 0.6; cursor: default; }
    .metodo__btn span { font-weight: 700; }
    .metodo__btn small { color: var(--text-muted); }
    .metodo__loading, .pix__status { display: flex; align-items: center; gap: 0.4rem; margin: 1rem 0 0; color: var(--text-muted); }
    .metodo__erro { margin: 0.75rem 0 0; color: var(--danger); font-weight: 600; }
    .pix { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; }
    .pix__valor { font-size: 1.3rem; font-weight: 800; margin: 0; }
    .pix__qr { width: 220px; height: 220px; max-width: 100%; border: 1px solid var(--border); border-radius: 8px; background: #fff; padding: 6px; }
    .pix__hint { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
    .pix__code { display: flex; gap: 0.5rem; width: 100%; align-items: stretch; }
    .pix__code code {
      flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      padding: 0.55rem 0.7rem; border: 1px solid var(--border); border-radius: 8px;
      background: var(--surface-alt); font-size: 0.8rem;
    }
    .simular { margin-top: 0.5rem; }
    .cartao, .ok, .erro { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; }
    .ok { color: var(--success); }
    .ok strong { font-size: 1.2rem; }
    .ok p, .erro p { margin: 0; color: var(--text-muted); }
    .ok .btn-primary { text-decoration: none; margin-top: 0.5rem; }
  `,
})
export class CheckoutPage implements OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tipo = signal<TipoCheckout>('upgrade');
  private readonly planoAlvo = signal<PlanoAtual>('GRADUADO');

  protected readonly carregando = signal(true);
  protected readonly iniciando = signal(false);
  protected readonly cobranca = signal<IniciarCheckout | null>(null);
  protected readonly concedido = signal(false);
  protected readonly expirado = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly copiado = signal(false);

  private pollId: ReturnType<typeof setInterval> | null = null;

  protected readonly mostrarSimular = !environment.production;

  protected readonly nomePlanoAlvo = computed(() => NOME_PLANO[this.planoAlvo()]);

  protected readonly titulo = computed(() =>
    this.tipo() === 'slot' ? 'Comprar vaga avulsa' : 'Assinar ' + this.nomePlanoAlvo(),
  );

  /** Valor formatado: o do gateway (cobrança) ou o do catálogo (antes de iniciar). */
  protected readonly valorFmt = computed(() => {
    const cent =
      this.cobranca()?.valorCentavos ??
      (this.tipo() === 'upgrade'
        ? PLANOS.find((p) => p.plano === this.planoAlvo())?.precoCentavos ?? 0
        : 990);
    return `R$ ${(cent / 100).toFixed(2).replace('.', ',')}`;
  });

  protected readonly qrSrc = computed(() => {
    const b64 = this.cobranca()?.brCodeBase64;
    if (!b64) return null;
    return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
  });

  constructor() {
    // Chegou ao checkout: consome o "plano pendente" do cadastro (o authGuard
    // usa essa chave para trazer o professor até aqui). Limpar evita loop e que
    // um abandono force o pagamento de novo na próxima navegação.
    localStorage.removeItem(PLANO_PENDENTE_KEY);

    const qp = this.route.snapshot.queryParamMap;
    const tipo = qp.get('tipo') === 'slot' ? 'slot' : 'upgrade';
    this.tipo.set(tipo);
    const plano = qp.get('plano') as PlanoAtual | null;
    if (plano) this.planoAlvo.set(plano);

    if (!this.profileService.profile()) {
      this.profileService.load().subscribe({
        next: () => this.decidir(),
        error: () => this.decidir(),
      });
    } else {
      this.decidir();
    }
  }

  /** Admin e destino gratuito concedem na hora; senão, mostra o seletor. */
  private decidir(): void {
    const admin = this.profileService.profile()?.isAdmin ?? false;
    const gratuito = this.tipo() === 'upgrade' && this.planoAlvo() === 'ESTAGIARIO';
    if (admin || gratuito) {
      this.iniciar('PIX'); // método ignorado no backend quando concede na hora
    } else {
      this.carregando.set(false);
    }
  }

  protected iniciar(metodo: MetodoPagamento): void {
    this.iniciando.set(true);
    this.erro.set(null);
    this.expirado.set(false);
    const req$ =
      this.tipo() === 'slot'
        ? this.profileService.comprarSlotAvulso(metodo)
        : this.profileService.upgradePlano(this.planoAlvo(), metodo);

    req$.subscribe({
      next: (r) => this.aoIniciar(r),
      error: () => {
        this.iniciando.set(false);
        this.carregando.set(false);
        this.erro.set('Não foi possível gerar a cobrança. Tente novamente.');
      },
    });
  }

  private aoIniciar(r: IniciarCheckout): void {
    this.iniciando.set(false);
    this.carregando.set(false);
    if (r.concedido) {
      this.concedido.set(true);
      return;
    }
    if (r.metodo === 'CARTAO' && r.url) {
      window.location.href = r.url; // checkout hospedado do gateway
      return;
    }
    this.cobranca.set(r);
    if (r.billingId) this.iniciarPolling(r.billingId);
  }

  private iniciarPolling(billingId: string): void {
    this.pararPolling();
    this.pollId = setInterval(() => {
      this.profileService.statusCobranca(billingId).subscribe({
        next: ({ status }) => {
          if (status === 'PAID') {
            this.pararPolling();
            this.profileService.load().subscribe();
            this.cobranca.set(null);
            this.concedido.set(true);
          } else if (status === 'EXPIRED' || status === 'CANCELLED') {
            this.pararPolling();
            this.cobranca.set(null);
            this.expirado.set(true);
          }
        },
        error: () => {},
      });
    }, 4000);
  }

  protected simular(): void {
    const id = this.cobranca()?.billingId;
    if (!id) return;
    this.profileService.simularPagamento(id).subscribe({
      next: () => {
        this.pararPolling();
        this.profileService.load().subscribe();
        this.cobranca.set(null);
        this.concedido.set(true);
      },
      error: () => this.erro.set('Simulação indisponível.'),
    });
  }

  protected copiar(texto: string): void {
    navigator.clipboard?.writeText(texto).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }

  protected reiniciar(): void {
    this.expirado.set(false);
    this.cobranca.set(null);
    this.carregando.set(false);
  }

  ngOnDestroy(): void {
    this.pararPolling();
  }

  private pararPolling(): void {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }
}
