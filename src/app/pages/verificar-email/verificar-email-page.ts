import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Logo } from '../../ui/logo/logo';

/** Intervalo do poll: rápido o bastante para parecer instantâneo ao voltar do e-mail. */
const POLL_MS = 5000;

/**
 * Sala de espera da confirmação de e-mail. O painel fica bloqueado até o
 * professor clicar no link (o backend devolve 403 EMAIL_NAO_VERIFICADO e o
 * interceptor traz para cá).
 *
 * A tela faz *poll* no `GET /auth/verificacao`, que lê o estado ao vivo — o
 * claim do token fica congelado na emissão e continuaria dizendo "não
 * verificado" mesmo depois do clique. Ao confirmar, renova a sessão: o token
 * novo já nasce verificado e o professor segue direto, sem entrar de novo.
 */
@Component({
  selector: 'app-verificar-email-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Logo, Icon],
  template: `
    <div class="wrap">
      <app-logo class="logo" [size]="40" />
      <app-card title="Confirme seu e-mail">
        <div class="envelope"><app-icon name="mail" [size]="44" /></div>

        <p class="texto">
          Enviamos um link de confirmação para
          @if (email()) {
            <strong>{{ email() }}</strong>
          } @else {
            <strong>o seu e-mail</strong>
          }
          . Abra a mensagem e toque no link para liberar o Tichr.
        </p>
        <p class="dica">
          Esta página se atualiza sozinha assim que você confirmar. Não achou?
          Procure na caixa de spam.
        </p>

        @if (msg()) {
          <p class="ok">{{ msg() }}</p>
        }
        @if (erro()) {
          <p class="error">{{ erro() }}</p>
        }

        <button
          class="btn-outline full"
          type="button"
          [disabled]="reenviando()"
          (click)="reenviar()"
        >
          {{ reenviando() ? 'Enviando…' : 'Reenviar e-mail' }}
        </button>
      </app-card>

      <button class="sair" type="button" (click)="sair()">Sair</button>
    </div>
  `,
  styles: `
    .wrap {
      max-width: 380px;
      margin: 0 auto;
      padding: 4rem 1.25rem;
    }
    .logo {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .envelope {
      display: grid;
      place-items: center;
      width: 84px;
      height: 84px;
      margin: 0.25rem auto 1.25rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
    }
    .texto {
      margin: 0 0 0.75rem;
      line-height: 1.6;
      text-align: center;
    }
    .dica {
      margin: 0 0 1.25rem;
      font-size: 0.85rem;
      line-height: 1.5;
      text-align: center;
      color: var(--text-muted);
    }
    .full {
      width: 100%;
    }
    .ok {
      margin: 0 0 0.75rem;
      color: var(--primary);
      font-weight: 600;
      text-align: center;
    }
    .error {
      margin: 0 0 0.75rem;
      color: var(--danger);
      text-align: center;
    }
    .sair {
      display: block;
      margin: 1.25rem auto 0;
      background: none;
      border: none;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
    }
  `,
})
export class VerificarEmailPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly email = signal<string | null>(null);
  protected readonly reenviando = signal(false);
  protected readonly msg = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.auth.conta().subscribe({
      next: (c) => {
        this.email.set(c.email);
        // Já confirmou (ex.: abriu o link em outra aba antes de voltar aqui).
        if (c.emailVerificado) this.liberar();
      },
      error: () => {
        /* sem o e-mail a tela ainda funciona, só menos específica. */
      },
    });

    this.timer = setInterval(() => this.checar(), POLL_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private checar(): void {
    this.auth.statusVerificacao().subscribe({
      next: (r) => {
        if (r.verificado) this.liberar();
      },
      error: () => {
        /* poll silencioso: erro de rede aqui não vira modal. */
      },
    });
  }

  /**
   * Renova a sessão antes de seguir. O `email_verified` está assado no ID token
   * atual, então sem o refresh o professor bateria de novo na trava do guard.
   */
  private liberar(): void {
    clearInterval(this.timer);
    this.auth.refresh().subscribe({
      next: () => {
        // O perfil pode ter sido cacheado antes; recarrega para o painel abrir cheio.
        this.profile.load().subscribe({
          next: () => this.seguir(),
          error: () => this.seguir(),
        });
      },
      error: () => {
        // Refresh morto (cookie perdido/limpo): entrar de novo resolve.
        this.auth.limparSessaoLocal();
        void this.router.navigateByUrl('/login');
      },
    });
  }

  /**
   * Depois de confirmar o e-mail, vai para o painel. Se houver um plano pago
   * pendente do cadastro (localStorage), o `authGuard` intercepta a entrada
   * autenticada e leva ao `/checkout` — mesma regra que cobre o retorno pelo
   * link do e-mail (que cai em /login → dashboard).
   */
  private seguir(): void {
    void this.router.navigateByUrl('/dashboard');
  }

  protected reenviar(): void {
    this.reenviando.set(true);
    this.msg.set(null);
    this.erro.set(null);
    this.auth.reenviarVerificacao().subscribe({
      next: () => {
        this.msg.set('E-mail reenviado. Confira sua caixa de entrada.');
        this.reenviando.set(false);
      },
      error: (e: { status?: number; error?: { code?: string } }) => {
        this.erro.set(
          e.error?.code === 'VERIFICACAO_COOLDOWN'
            ? 'Muitas tentativas. Aguarde alguns minutos antes de pedir de novo.'
            : 'Não foi possível reenviar agora. Tente novamente.',
        );
        this.reenviando.set(false);
      },
    });
  }

  protected sair(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
