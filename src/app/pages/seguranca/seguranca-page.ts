import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { ContaAuth } from '../../core/models';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Segurança da conta: e-mail de acesso e senha.
 *
 * Os dois fluxos sensíveis reaproveitam o que já existe em vez de inventar:
 * a troca de e-mail copia a reautenticação por senha do `excluir-conta-card`, e
 * "alterar senha" dispara o mesmo link de redefinição da tela pública — assim
 * não há um endpoint de troca de senha autenticada para manter.
 */
@Component({
  selector: 'app-seguranca-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Modal, Icon, Spinner],
  template: `
    <h1 class="title">Segurança</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <app-card title="E-mail de acesso">
        @if (pendente()) {
          <p class="pendente">
            <app-icon name="mail" [size]="18" />
            Confirme pelo link que enviamos para <b>{{ pendente() }}</b>. Seu
            e-mail atual continua valendo até lá, e você precisará entrar de novo
            depois de confirmar.
          </p>
        } @else {
          <div class="linha">
            <div class="linha__txt">
              <strong>{{ conta()?.email }}</strong>
              @if (conta()?.emailVerificado) {
                <span class="selo"><app-icon name="check" [size]="13" /> Confirmado</span>
              }
            </div>
            <button type="button" class="btn-outline" (click)="abrirEmail()">
              Alterar
            </button>
          </div>
        }
      </app-card>

      <app-card title="Senha">
        @if (senhaEnviada()) {
          <p class="ok">Enviamos um link de redefinição para o seu e-mail.</p>
        } @else {
          <div class="linha">
            <div class="linha__txt">
              <strong>••••••••</strong>
              <span class="sub">Enviamos um link seguro para você criar uma nova.</span>
            </div>
            <button
              type="button"
              class="btn-outline"
              [disabled]="enviandoSenha()"
              (click)="alterarSenha()"
            >
              {{ enviandoSenha() ? 'Enviando…' : 'Alterar' }}
            </button>
          </div>
        }
      </app-card>
    }

    <app-modal [open]="aberto()" title="Alterar e-mail" (close)="fechar()">
      <p class="aviso">
        Enviaremos um link de confirmação para o e-mail novo. A troca só acontece
        quando você tocar nesse link — até lá, o e-mail atual continua valendo.
      </p>
      <label class="campo">
        <span>Novo e-mail</span>
        <input
          class="tichr-input"
          type="email"
          autocomplete="email"
          [value]="novoEmail()"
          (input)="novoEmail.set($any($event.target).value)"
        />
      </label>
      <label class="campo">
        <span>Sua senha atual</span>
        <input
          class="tichr-input"
          type="password"
          autocomplete="current-password"
          [value]="senha()"
          (input)="senha.set($any($event.target).value)"
        />
      </label>
      @if (erro()) {
        <p class="erro">{{ erro() }}</p>
      }
      <div class="acoes" modal-actions>
        <button type="button" class="btn-outline" (click)="fechar()">Cancelar</button>
        <button
          type="button"
          class="btn-primary"
          [disabled]="!podeTrocar() || salvando()"
          (click)="confirmarEmail()"
        >
          {{ salvando() ? 'Enviando…' : 'Enviar confirmação' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .linha { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .linha__txt { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .linha__txt strong { overflow-wrap: anywhere; }
    .sub { font-size: 0.82rem; color: var(--text-muted); }
    .selo {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      align-self: flex-start;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary);
    }
    .pendente {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0;
      line-height: 1.55;
      color: var(--text-muted);
    }
    .pendente b { color: var(--text); overflow-wrap: anywhere; }
    .ok { margin: 0; font-weight: 600; line-height: 1.55; }
    .aviso { margin: 0 0 1rem; line-height: 1.55; color: var(--text-muted); }
    .campo { display: block; margin-bottom: 0.85rem; }
    .campo > span { display: block; margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .erro { color: var(--danger); margin: 0.25rem 0 0; }
    .acoes { display: flex; gap: 0.5rem; justify-content: flex-end; }
  `,
})
export class SegurancaPage {
  private readonly auth = inject(AuthService);

  protected readonly conta = signal<ContaAuth | null>(null);
  protected readonly carregando = signal(true);

  /** E-mail novo aguardando confirmação; troca o card por um aviso. */
  protected readonly pendente = signal<string | null>(null);

  protected readonly aberto = signal(false);
  protected readonly novoEmail = signal('');
  protected readonly senha = signal('');
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly enviandoSenha = signal(false);
  protected readonly senhaEnviada = signal(false);

  protected readonly podeTrocar = computed(
    () => !!this.novoEmail().trim() && !!this.senha(),
  );

  constructor() {
    this.auth.conta().subscribe({
      next: (c) => {
        this.conta.set(c);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected abrirEmail(): void {
    this.novoEmail.set('');
    this.senha.set('');
    this.erro.set(null);
    this.aberto.set(true);
  }

  protected fechar(): void {
    if (this.salvando()) return;
    this.aberto.set(false);
  }

  protected confirmarEmail(): void {
    if (!this.podeTrocar()) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.auth.trocarEmail(this.novoEmail().trim(), this.senha()).subscribe({
      next: (r) => {
        this.pendente.set(r.novoEmail);
        this.salvando.set(false);
        this.aberto.set(false);
      },
      error: (e: HttpErrorResponse) => {
        const code = (e.error as { code?: string } | null)?.code;
        this.erro.set(
          code === 'SENHA_INVALIDA'
            ? 'Senha incorreta. O e-mail não foi alterado.'
            : code === 'EMAIL_EM_USO'
              ? 'Esse e-mail já está em uso.'
              : 'Não foi possível alterar o e-mail. Tente novamente.',
        );
        this.salvando.set(false);
      },
    });
  }

  /**
   * Reaproveita o fluxo público de redefinição para o e-mail da própria conta,
   * em vez de abrir um endpoint de troca de senha autenticada que a spec não
   * pediu — menos superfície, mesmo resultado.
   */
  protected alterarSenha(): void {
    const email = this.conta()?.email;
    if (!email) return;
    this.enviandoSenha.set(true);
    this.auth.recuperarSenha(email).subscribe({
      next: () => {
        this.senhaEnviada.set(true);
        this.enviandoSenha.set(false);
      },
      error: () => this.enviandoSenha.set(false),
    });
  }
}
