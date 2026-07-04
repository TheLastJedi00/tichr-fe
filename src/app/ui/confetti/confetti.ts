import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Piece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotate: number;
}

const CORES = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#ffffff'];

/**
 * Chuva de confetes rápida (dumb, puro CSS) para o feedback de acerto do Qlick.
 * Peças pré-sorteadas uma vez; some sozinha ao fim da animação. Reduced-motion oculta.
 */
@Component({
  selector: 'app-confetti',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confetti" aria-hidden="true">
      @for (p of pieces; track $index) {
        <span
          class="piece"
          [style.left.%]="p.left"
          [style.width.px]="p.size"
          [style.height.px]="p.size * 0.4"
          [style.background]="p.color"
          [style.animation-delay.ms]="p.delay"
          [style.animation-duration.ms]="p.duration"
          [style.transform]="'rotate(' + p.rotate + 'deg)'"
        ></span>
      }
    </div>
  `,
  styles: `
    .confetti {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 200;
    }
    .piece {
      position: absolute;
      top: -12px;
      border-radius: 2px;
      opacity: 0;
      animation-name: fall;
      animation-timing-function: ease-in;
      animation-iteration-count: 1;
    }
    @keyframes fall {
      0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(105vh) rotate(360deg); opacity: 0.9; }
    }
    @media (prefers-reduced-motion: reduce) {
      .confetti { display: none; }
    }
  `,
})
export class Confetti {
  protected readonly pieces: Piece[] = Array.from({ length: 44 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 400,
    duration: 1400 + Math.random() * 1200,
    color: CORES[i % CORES.length],
    size: 7 + Math.random() * 7,
    rotate: Math.random() * 360,
  }));
}
