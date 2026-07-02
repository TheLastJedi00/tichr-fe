import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Card } from '../../ui/card/card';

/** Tela de login (email/senha). MVP invite-only: sem cadastro. */
@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card],
  template: `
    <div class="wrap">
      <span class="logo">Tichr</span>
      <app-card title="Entrar">
        <form (submit)="$event.preventDefault(); entrar()">
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
          <label class="campo">
            <span>Senha</span>
            <input
              class="tichr-input"
              type="password"
              autocomplete="current-password"
              [value]="senha()"
              (input)="senha.set($any($event.target).value)"
            />
          </label>

          @if (erro()) {
            <p class="error">{{ erro() }}</p>
          }

          <button class="btn-primary full" type="submit" [disabled]="entrando()">
            {{ entrando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </app-card>
    </div>
  `,
  styles: `
    .wrap {
      max-width: 380px;
      margin: 0 auto;
      padding: 4rem 1.25rem;
    }
    .logo {
      display: block;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 1.25rem;
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
    .error {
      color: var(--danger);
      margin: 0 0 0.75rem;
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly entrando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected entrar(): void {
    if (!this.email() || !this.senha()) {
      this.erro.set('Preencha email e senha.');
      return;
    }
    this.entrando.set(true);
    this.erro.set(null);
    this.auth
      .login(this.email(), this.senha())
      .then(() => this.router.navigateByUrl('/dashboard'))
      .catch(() => {
        this.erro.set('Email ou senha inválidos.');
        this.entrando.set(false);
      });
  }
}
