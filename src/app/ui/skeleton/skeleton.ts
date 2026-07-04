import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Converte número para px; string passa direto. */
function toCss(v: string | number): string {
  return typeof v === 'number' ? `${v}px` : v;
}

/**
 * Bloco de esqueleto (dumb) com efeito shimmer varrendo da esquerda p/ direita.
 * Compõe silhuetas de cards/listas durante o carregamento. Reduced-motion troca
 * o sweep por um pulse suave.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sk" [style.width]="width()" [style.height]="height()" [style.borderRadius]="radius()"></span>`,
  styles: `
    :host { display: block; }
    .sk {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--surface-alt);
    }
    .sk::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(
        90deg,
        transparent,
        color-mix(in srgb, var(--surface) 65%, transparent),
        transparent
      );
      animation: shimmer 1.3s infinite;
    }
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sk::after { animation: none; }
      .sk { animation: pulse 1.4s infinite ease-in-out; }
      @keyframes pulse { 50% { opacity: 0.55; } }
    }
  `,
})
export class Skeleton {
  /** Aceita número (px) ou string CSS (ex.: '60%', '1.2rem'). */
  readonly width = input<string, string | number>('100%', { transform: toCss });
  readonly height = input<string, string | number>('1rem', { transform: toCss });
  readonly radius = input<string, string | number>('8px', { transform: toCss });
}
