import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Overlay de tutorial (dumb): escurece o fundo e mostra um card animado com
 * título, explicação e o "primeiro passo". Botões Pular / Entendi fecham.
 * Respeita prefers-reduced-motion.
 */
@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="backdrop" (click)="pular.emit()">
      <div class="card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <span class="badge"><app-icon name="sparkles" [size]="16" /> Dica rápida</span>
        <h3>{{ titulo() }}</h3>
        <p class="texto">{{ texto() }}</p>
        <p class="passo">
          <app-icon name="check" [size]="16" />
          <span>{{ passo() }}</span>
        </p>
        <div class="acoes">
          <button class="btn-outline" type="button" (click)="pular.emit()">Pular</button>
          <button class="btn-primary" type="button" (click)="entendi.emit()">Entendi</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 60;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 1rem;
      animation: fade 0.2s ease;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      animation: rise 0.28s cubic-bezier(0.2, 0.9, 0.3, 1);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      align-self: flex-start;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
    }
    h3 {
      margin: 0;
      font-size: 1.15rem;
    }
    .texto {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .passo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      color: var(--primary);
      font-weight: 600;
      font-size: 0.9rem;
    }
    .acoes {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    .acoes button {
      flex: 1;
    }
    @media (min-width: 640px) {
      .backdrop {
        align-items: center;
      }
    }
    @keyframes fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes rise {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .backdrop,
      .card {
        animation: none;
      }
    }
  `,
})
export class TutorialOverlay {
  readonly titulo = input('');
  readonly texto = input('');
  readonly passo = input('');
  /** Fechar sem ação (clicar fora ou "Pular"). */
  readonly pular = output<void>();
  /** Confirmar ("Entendi"). */
  readonly entendi = output<void>();
}
