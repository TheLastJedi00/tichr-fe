import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Card } from '../../ui/card/card';
import { Logo } from '../../ui/logo/logo';

/**
 * "Esqueci minha senha". Um campo só.
 *
 * A mensagem de sucesso é GENÉRICA de propósito e não confirma se o e-mail
 * existe: dizer "não encontramos essa conta" transformaria a tela num oráculo
 * de quem tem conta no Tichr. O backend colabora — responde igual nos dois
 * casos —, então aqui basta não inventar diferença.
 */
@Component({
  selector: 'app-recuperar-senha-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, RouterLink, Logo],
  template: `
    <div class="wrap">
      <a class="voltar" routerLink="/login">← Voltar ao login</a>
      <app-logo class="logo" [size]="40" />
      <app-card title="Esqueci minha senha">
        @if (enviado()) {
          <p class="ok">
            Se o e-mail estiver cadastrado, as instruções foram enviadas.
          </p>
          <p class="dica">
            Abra o link que enviamos para cadastrar uma senha nova. Não achou?
            Procure na caixa de spam.
          </p>
          <a class="btn-primary full centro" routerLink="/login">Voltar ao login</a>
        } @else {
          <p class="texto">
            Informe o e-mail da sua conta e enviaremos um link para você criar
            uma senha nova.
          </p>
          <form (submit)="$event.preventDefault(); enviar()">
            <label class="campo">
              <span>Email</span>
              <input
                class="tichr-input"
                type="email"
                autocomplete="email"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
              />
            </label>

            @if (erro()) {
              <p class="error">{{ erro() }}</p>
            }

            <button class="btn-primary full" type="submit" [disabled]="enviando()">
              {{ enviando() ? 'Enviando…' : 'Enviar link' }}
            </button>
          </form>
        }
      </app-card>
    </div>
  `,
  styles: `
    .wrap {
      max-width: 380px;
      margin: 0 auto;
      padding: 4rem 1.25rem;
    }
    .voltar {
      display: inline-block;
      margin-bottom: 1.5rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .logo {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .texto {
      margin: 0 0 1.25rem;
      line-height: 1.6;
      color: var(--text-muted);
    }
    .campo {
      display: block;
      margin-bottom: 1rem;
    }
    .campo > span {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .full {
      width: 100%;
    }
    .centro {
      display: block;
      text-align: center;
      text-decoration: none;
    }
    .ok {
      margin: 0 0 0.75rem;
      font-weight: 600;
      line-height: 1.6;
    }
    .dica {
      margin: 0 0 1.25rem;
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--text-muted);
    }
    .error {
      color: var(--danger);
      margin: 0 0 0.75rem;
    }
  `,
})
export class RecuperarSenhaPage {
  private readonly auth = inject(AuthService);

  protected readonly email = signal('');
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected enviar(): void {
    const email = this.email().trim();
    if (!email) {
      this.erro.set('Informe o seu e-mail.');
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    this.auth.recuperarSenha(email).subscribe({
      // O backend responde igual para e-mail existente e inexistente, então o
      // sucesso aqui não confirma nada sobre a conta — é o ponto.
      next: () => this.enviado.set(true),
      error: () => {
        this.erro.set('Não foi possível enviar agora. Tente novamente.');
        this.enviando.set(false);
      },
    });
  }
}
