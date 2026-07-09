import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Modal } from '../../ui/modal/modal';

/** Palavra de confirmação exigida para liberar a exclusão. */
const CONFIRMA = 'EXCLUIR';

/**
 * Zona de perigo: auto-exclusão da conta (direito LGPD). Abre um modal que exige
 * a senha (reautenticação) e digitar "EXCLUIR"; ao confirmar, chama a API, desloga
 * e volta para a landing. Ação irreversível.
 */
@Component({
  selector: 'app-excluir-conta-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Modal],
  template: `
    <app-card>
      <div class="zp">
        <div class="zp__txt">
          <strong class="zp__titulo">Excluir minha conta</strong>
          <span class="zp__sub">
            Apaga definitivamente sua conta e todos os dados atrelados (turmas,
            alunos, jogos e histórico). Esta ação é irreversível.
          </span>
        </div>
        <button type="button" class="btn-danger" (click)="abrir()">Excluir conta</button>
      </div>
    </app-card>

    <app-modal [open]="aberto()" title="Excluir conta definitivamente" (close)="fechar()">
      <p class="aviso">
        Isso apaga sua conta e <b>todos os dados</b> (turmas, alunos, jogos e
        histórico), sem possibilidade de recuperação. Para confirmar, informe sua
        senha e digite <b>{{ confirmaPalavra }}</b>.
      </p>
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
      <label class="campo">
        <span>Digite {{ confirmaPalavra }} para confirmar</span>
        <input
          class="tichr-input"
          type="text"
          autocomplete="off"
          [value]="confirmacao()"
          (input)="confirmacao.set($any($event.target).value)"
        />
      </label>
      @if (erro()) {
        <p class="erro">{{ erro() }}</p>
      }
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="fechar()" [disabled]="excluindo()">
          Cancelar
        </button>
        <button
          class="btn-danger"
          type="button"
          (click)="confirmar()"
          [disabled]="!podeExcluir() || excluindo()"
        >
          {{ excluindo() ? 'Excluindo…' : 'Excluir para sempre' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .zp { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .zp__txt { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
    .zp__titulo { color: var(--danger); }
    .zp__sub { font-size: 0.85rem; color: var(--text-muted); }
    .btn-danger { flex: 0 0 auto; font: inherit; font-weight: 700; padding: 0.55rem 1rem; border-radius: var(--radius); border: 1px solid var(--danger); background: var(--danger); color: #fff; cursor: pointer; }
    .btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
    .aviso { margin: 0 0 1rem; color: var(--text); }
    .campo { display: block; margin-bottom: 0.75rem; }
    .campo > span { display: block; margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .erro { color: var(--danger); margin: 0.25rem 0 0; }
  `,
})
export class ExcluirContaCard {
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly confirmaPalavra = CONFIRMA;
  protected readonly aberto = signal(false);
  protected readonly senha = signal('');
  protected readonly confirmacao = signal('');
  protected readonly excluindo = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly podeExcluir = computed(
    () => !!this.senha() && this.confirmacao().trim().toUpperCase() === CONFIRMA,
  );

  protected abrir(): void {
    this.senha.set('');
    this.confirmacao.set('');
    this.erro.set(null);
    this.aberto.set(true);
  }

  protected fechar(): void {
    if (this.excluindo()) return;
    this.aberto.set(false);
  }

  protected confirmar(): void {
    if (!this.podeExcluir()) return;
    this.excluindo.set(true);
    this.erro.set(null);
    this.profile.excluirConta(this.senha()).subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigateByUrl('/');
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(
          e.status === 401
            ? 'Senha incorreta. A conta não foi excluída.'
            : 'Não foi possível excluir a conta. Tente novamente.',
        );
        this.excluindo.set(false);
      },
    });
  }
}
