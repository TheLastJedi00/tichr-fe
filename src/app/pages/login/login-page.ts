import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Card } from '../../ui/card/card';
import { Logo } from '../../ui/logo/logo';

/** Tela de login (email/senha), com saídas para cadastro, recuperação e portal do aluno. */
@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, RouterLink, Logo],
  template: `
    <div class="wrap">
      <a class="voltar" routerLink="/">← Voltar ao site</a>
      <app-logo class="logo" [size]="40" />
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

      <a class="esqueci" routerLink="/recuperar-senha">Esqueci minha senha</a>
      <a class="criar" routerLink="/cadastro">Criar conta grátis</a>
      <a class="aluno" routerLink="/entrar">Entrar como aluno</a>
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
    .esqueci,
    .criar,
    .aluno {
      display: block;
      text-align: center;
      margin-top: 1rem;
      font-weight: 600;
      color: var(--primary);
    }
    .esqueci {
      margin-top: 1.25rem;
      color: var(--text-muted);
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
    this.auth.login(this.email(), this.senha()).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.erro.set('Email ou senha inválidos.');
        this.entrando.set(false);
      },
    });
  }
}
