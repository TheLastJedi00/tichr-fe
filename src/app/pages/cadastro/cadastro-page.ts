import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';

/**
 * Cadastro frictionless (plano Estagiário): formulário mínimo — e-mail, senha e
 * confirmação. Ao criar a conta o backend já devolve o token e caímos direto no
 * Dashboard (onde o soft-block pede a conclusão do perfil).
 */
@Component({
  selector: 'app-cadastro-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, RouterLink],
  template: `
    <div class="wrap">
      <span class="logo">Tichr</span>
      <app-card title="Criar conta">
        <p class="sub">Comece grátis em segundos. Só precisamos do essencial.</p>
        <form (submit)="$event.preventDefault(); criar()">
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
              autocomplete="new-password"
              [value]="senha()"
              (input)="senha.set($any($event.target).value)"
            />
          </label>
          <label class="campo">
            <span>Confirmar senha</span>
            <input
              class="tichr-input"
              type="password"
              autocomplete="new-password"
              [value]="confirma()"
              (input)="confirma.set($any($event.target).value)"
            />
          </label>

          <label class="campo">
            <span>Cupom <small>(opcional)</small></span>
            <input
              class="tichr-input cupom"
              type="text"
              autocomplete="off"
              placeholder="Tem um código de desconto?"
              [value]="cupom()"
              (input)="cupom.set($any($event.target).value.toUpperCase())"
            />
          </label>

          @if (erro()) {
            <p class="error">{{ erro() }}</p>
          }

          <button class="btn-primary full" type="submit" [disabled]="criando() || !podeEnviar()">
            {{ criando() ? 'Criando…' : 'Criar minha conta' }}
          </button>
        </form>
      </app-card>

      <a class="voltar" routerLink="/login">Já tenho conta — Entrar</a>
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
    .sub {
      margin: 0 0 1rem;
      color: var(--text-muted);
      font-size: 0.9rem;
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
    .campo > span small { font-weight: 500; opacity: 0.8; }
    .cupom { text-transform: uppercase; letter-spacing: 0.05em; }
    .full {
      width: 100%;
    }
    .error {
      color: var(--danger);
      margin: 0 0 0.75rem;
    }
    .voltar {
      display: block;
      text-align: center;
      margin-top: 1rem;
      font-weight: 600;
      color: var(--primary);
    }
  `,
})
export class CadastroPage {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly confirma = signal('');
  protected readonly cupom = signal('');
  protected readonly criando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly podeEnviar = computed(
    () => !!this.email() && this.senha().length >= 6 && !!this.confirma(),
  );

  protected criar(): void {
    if (!this.email() || !this.senha()) {
      this.erro.set('Preencha e-mail e senha.');
      return;
    }
    if (this.senha().length < 6) {
      this.erro.set('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (this.senha() !== this.confirma()) {
      this.erro.set('As senhas não conferem.');
      return;
    }
    this.criando.set(true);
    this.erro.set(null);
    this.auth.signup(this.email(), this.senha()).subscribe({
      next: () => this.aplicarCupomEIr(),
      error: (e: HttpErrorResponse) => {
        this.erro.set(
          e.status === 409
            ? 'Esse e-mail já está cadastrado.'
            : 'Não foi possível criar a conta. Tente novamente.',
        );
        this.criando.set(false);
      },
    });
  }

  /**
   * Conta já criada e autenticada: aplica o cupom (se houver) e segue para o
   * painel. Cupom é opcional e não bloqueia — se inválido, o usuário pode tentar
   * de novo depois em "Meu Plano".
   */
  private aplicarCupomEIr(): void {
    const codigo = this.cupom().trim();
    if (!codigo) {
      this.router.navigateByUrl('/dashboard');
      return;
    }
    this.profile.aplicarCupom(codigo).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => this.router.navigateByUrl('/dashboard'),
    });
  }
}
