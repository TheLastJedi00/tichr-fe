import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Loader temático do lobby do Tichr Qlick (dumb). Quatro bolinhas nas cores das
 * alternativas (vermelho/azul/amarelo/verde) pulando em sequência — passa a
 * sensação de "o jogo já começou, estamos aquecendo". Respeita reduced-motion.
 */
@Component({
  selector: 'app-lobby-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loader" aria-label="Aguardando o professor iniciar">
      <span class="ball ball--a"></span>
      <span class="ball ball--b"></span>
      <span class="ball ball--c"></span>
      <span class="ball ball--d"></span>
    </div>
  `,
  styles: `
    .loader {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 0.6rem;
      height: 48px;
    }
    .ball {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      animation: bounce 1s infinite ease-in-out;
    }
    .ball--a { background: #ef4444; animation-delay: 0s; }
    .ball--b { background: #3b82f6; animation-delay: 0.12s; }
    .ball--c { background: #f59e0b; animation-delay: 0.24s; }
    .ball--d { background: #22c55e; animation-delay: 0.36s; }
    @keyframes bounce {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.85; }
      40% { transform: translateY(-18px) scale(1.12); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ball { animation: pulse 1.4s infinite ease-in-out; }
      @keyframes pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
    }
  `,
})
export class LobbyLoader {}
