import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FeedbackService } from '../../core/feedback.service';
import { CategoriaFeedback } from '../../core/models';
import { linksPainel } from '../../core/nav-links';
import { ProfileService } from '../../core/profile.service';
import { FeedbackModal } from '../feedback-modal/feedback-modal';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Modal } from '../modal/modal';
import { QuotaTracker } from '../quota-tracker/quota-tracker';

/**
 * Menu de navegacao (drawer/overlay) acionado pelo header.
 * O estado aberto/fechado e controlado pelo layout via [open].
 */
@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, IconButton, QuotaTracker, Modal, FeedbackModal],
  template: `
    @if (open()) {
      <div class="overlay" animate.enter="ov-in" animate.leave="ov-out" (click)="close.emit()">
        <nav class="drawer" animate.enter="dr-in" animate.leave="dr-out" (click)="$event.stopPropagation()">
          <div class="drawer__head">
            <span class="drawer__title">Menu</span>
            <app-icon-button
              name="close"
              variant="ghost"
              ariaLabel="Fechar menu"
              (clicked)="close.emit()"
            />
          </div>

          <ul class="drawer__list">
            @for (link of links(); track link.label) {
              <li>
                <a
                  class="drawer__link"
                  [routerLink]="link.path"
                  [queryParams]="link.query ?? null"
                  routerLinkActive="is-active"
                  (click)="close.emit()"
                >
                  <app-icon [name]="link.icon" [size]="18" />
                  {{ link.label }}
                  @if (link.locked) {
                    <app-icon class="drawer__lock" name="lock" [size]="15" />
                  }
                </a>
              </li>
            }
          </ul>

          <app-quota-tracker class="drawer__quota" />

          <button type="button" class="drawer__feedback" (click)="abrirFeedback()">
            <app-icon name="mail" [size]="18" /> Enviar feedback
          </button>

          <button type="button" class="drawer__sair" (click)="confirmarSair.set(true)">
            <app-icon name="logout" [size]="18" /> Sair da conta
          </button>
        </nav>
      </div>
    }

    <app-feedback-modal
      [open]="feedbackAberto()"
      [enviando]="enviandoFeedback()"
      [enviado]="feedbackEnviado()"
      [erro]="erroFeedback()"
      (enviar)="enviarFeedback($event)"
      (close)="fecharFeedback()"
    />

    <app-modal [open]="confirmarSair()" title="Sair da conta" (close)="confirmarSair.set(false)">
      <p class="muted">Tem certeza que deseja sair? Você precisará entrar de novo com seu e-mail e senha.</p>
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="confirmarSair.set(false)">Cancelar</button>
        <button class="drawer__sair-confirm" type="button" (click)="sair()">Sair</button>
      </div>
    </app-modal>
  `,
  styles: `
    .ov-in { animation: ov-fade 0.2s ease both; }
    .ov-out { animation: ov-fade 0.18s ease reverse both; }
    .dr-in { animation: dr-slide 0.24s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .dr-out { animation: dr-slide 0.2s ease reverse both; }
    @keyframes ov-fade { from { opacity: 0; } }
    @keyframes dr-slide { from { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) {
      .ov-in, .ov-out, .dr-in, .dr-out { animation: none; }
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      z-index: 50;
    }
    .drawer {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: min(280px, 80vw);
      background: var(--surface);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    .drawer__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .drawer__title {
      font-weight: 700;
    }
    .drawer__list {
      list-style: none;
      margin: 0;
      padding: 0.5rem;
    }
    .drawer__quota {
      margin-top: auto;
    }
    .drawer__feedback {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: calc(100% - 1rem);
      margin: 0.75rem 0.5rem 0.25rem;
      padding: 0.75rem;
      border-radius: var(--radius);
      border: 1px solid color-mix(in srgb, var(--primary) 40%, var(--border));
      background: color-mix(in srgb, var(--primary) 8%, transparent);
      color: var(--primary);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .drawer__feedback:hover { background: color-mix(in srgb, var(--primary) 15%, transparent); }
    .drawer__sair {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: calc(100% - 1rem);
      margin: 0.25rem 0.5rem 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius);
      border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--border));
      background: color-mix(in srgb, var(--danger) 8%, transparent);
      color: var(--danger);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .drawer__sair:hover { background: color-mix(in srgb, var(--danger) 15%, transparent); }
    .drawer__sair-confirm {
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      border: 1px solid var(--danger);
      background: var(--danger);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
    .muted { color: var(--text-muted); margin: 0; }
    .drawer__link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.75rem;
      border-radius: var(--radius);
      color: var(--text);
      font-weight: 500;
    }
    .drawer__link:hover {
      background: var(--surface-alt);
    }
    .drawer__link.is-active {
      color: var(--primary);
      background: var(--surface-alt);
    }
    .drawer__lock { margin-left: auto; color: var(--text-muted); }
  `,
})
export class MobileMenu {
  private readonly profileService = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  readonly open = input(false);
  readonly close = output<void>();

  protected readonly confirmarSair = signal(false);

  protected readonly feedbackAberto = signal(false);
  protected readonly enviandoFeedback = signal(false);
  protected readonly feedbackEnviado = signal(false);
  protected readonly erroFeedback = signal<string | null>(null);

  protected readonly links = computed(() =>
    linksPainel(this.profileService.profile()?.planoAtual),
  );

  /** Fecha o drawer e abre o form — o modal cobre a tela toda no mobile. */
  protected abrirFeedback(): void {
    this.feedbackEnviado.set(false);
    this.erroFeedback.set(null);
    this.feedbackAberto.set(true);
    this.close.emit();
  }

  protected fecharFeedback(): void {
    this.feedbackAberto.set(false);
  }

  protected enviarFeedback(dados: { categoria: CategoriaFeedback; mensagem: string }): void {
    this.enviandoFeedback.set(true);
    this.erroFeedback.set(null);
    // Rota e User-Agent lidos no clique: é o contexto do problema, não o de
    // quando a aba foi aberta.
    this.feedback
      .enviar({
        ...dados,
        rota: this.router.url.slice(0, 200),
        userAgent: navigator.userAgent.slice(0, 300),
      })
      .subscribe({
        next: () => {
          this.enviandoFeedback.set(false);
          this.feedbackEnviado.set(true);
        },
        error: () => {
          this.enviandoFeedback.set(false);
          this.erroFeedback.set('Não conseguimos enviar agora. Tente de novo em instantes.');
        },
      });
  }

  /** Encerra a sessão do professor e volta para o login. */
  protected sair(): void {
    this.confirmarSair.set(false);
    this.close.emit();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
