import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type GameName = 'qlick' | 'wor' | 'isolateus';

/**
 * Logos dos jogos (dumb). Fonte única — nenhuma tela deve desenhar a marca de um
 * jogo por conta própria. Originais em `.specs/015 - Logo/`.
 *
 * **Por que estas não precisam do par claro/escuro da marca-mãe.** No logo do Tichr o
 * glifo sangra até a borda do tile, então o tile não tem silhueta própria e a variante
 * errada faz o monograma sumir no fundo (ver `Logo`). Aqui o campo é colorido e sólido
 * e o glifo não encosta na borda: a silhueta se sustenta sozinha em qualquer fundo. O
 * contorno branco é só uma keyline — recorta o tile em superfície escura e some na
 * clara, o que é inofensivo. Uma variante só resolve os dois temas.
 *
 * As cores são as mesmas que as telas dos jogos já usam (`#b45309` Wor, `#84cc16`
 * Isolateus, azul da marca no Qlick) e são fixas: identificam o jogo, não o tema.
 *
 * Use onde o jogo aparece **como produto** (vitrine, hero da mini-landing, cards da
 * landing). Em uso funcional inline — chips, botões, rótulos de equipe — continue com
 * o `<app-icon>`: logo repetido em toda posição vira ruído e perde força.
 */
@Component({
  selector: 'app-game-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="mark"
      [style.--mark-size.px]="size()"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      [attr.aria-label]="label()"
    >
      @switch (game()) {
        @case ('qlick') {
          <rect x="5" y="5" width="390" height="390" rx="45" fill="#2563EB" />
          <rect x="5" y="5" width="390" height="390" rx="45" fill="none" stroke="white" stroke-width="10" />
          <circle cx="200" cy="200" r="115" fill="none" stroke="white" stroke-width="20" />
          <path
            d="M268.772 212.392L324.13 272.098C335.395 284.248 334.677 303.23 322.528 314.495L307.981 327.982C295.832 339.247 276.85 338.529 265.585 326.38L210.227 266.674L268.772 212.392Z"
            fill="white"
            stroke="#2563EB"
            stroke-width="10"
          />
          <path
            d="M274.053 276.746C260.027 289.824 242.467 294.377 223 273.5C203.533 252.623 198.86 223.361 212.886 210.282C226.912 197.203 254.064 203.525 273.531 224.402C292.998 245.279 288.079 263.667 274.053 276.746Z"
            fill="white"
          />
          <path
            d="M268.613 271.254C256.851 282.222 242.127 286.039 225.803 268.533C209.479 251.027 205.56 226.489 217.322 215.522C229.083 204.555 251.851 209.856 268.175 227.362C284.499 244.869 280.374 260.287 268.613 271.254Z"
            fill="#2563EB"
          />
        }
        @case ('wor') {
          <rect x="5" y="5" width="390" height="390" rx="45" fill="#B45309" />
          <rect x="5" y="5" width="390" height="390" rx="45" fill="none" stroke="white" stroke-width="10" />
          <path
            d="M60.3644 109.15C58.2161 102.677 63.0352 96 69.8554 96H98.7826C103.092 96 106.916 98.7603 108.273 102.85L178.636 314.85C180.784 321.323 175.965 328 169.145 328H140.217C135.908 328 132.084 325.24 130.727 321.15L60.3644 109.15Z"
            fill="white"
          />
          <path
            d="M290.744 102.887C292.09 98.7784 295.924 96 300.247 96H329.201C336.005 96 340.822 102.647 338.704 109.113L269.256 321.113C267.91 325.222 264.076 328 259.753 328H230.799C223.995 328 219.178 321.353 221.296 314.887L290.744 102.887Z"
            fill="white"
          />
          <path
            d="M173.19 156.716C174.25 152.196 178.282 149 182.925 149H212.382C218.828 149 223.59 155.009 222.118 161.284L184.81 320.284C183.75 324.804 179.718 328 175.075 328H145.618C139.172 328 134.41 321.991 135.882 315.716L173.19 156.716Z"
            fill="white"
          />
          <path
            d="M177.882 161.284C176.41 155.009 181.172 149 187.618 149H217.075C221.718 149 225.75 152.196 226.81 156.716L264.118 315.716C265.59 321.991 260.828 328 254.382 328H224.925C220.282 328 216.25 324.804 215.19 320.284L177.882 161.284Z"
            fill="white"
          />
          <rect x="195" y="96" width="10" height="53" fill="white" />
          <path
            d="M210 96C210 96 218.857 105.065 228.5 108C232.243 109.139 237.978 105.653 243 106C251.021 106.554 258 110.5 258 110.5C258 110.5 250.606 110.822 243 114.5C237.853 116.989 233.151 122.934 228.5 124C220.125 125.919 210 126 210 126V96Z"
            fill="white"
          />
        }
        @case ('isolateus') {
          <rect x="5" y="5" width="390" height="390" rx="45" fill="#84CC16" />
          <rect x="5" y="5" width="390" height="390" rx="45" fill="none" stroke="white" stroke-width="10" />
          <path
            d="M320.218 117.797C320.218 132.259 266.22 136.917 199.609 136.917C132.999 136.917 79 132.259 79 117.797C79 103.335 132.999 91.6116 199.609 91.6116C266.22 91.6116 320.218 103.335 320.218 117.797Z"
            fill="white"
          />
          <ellipse cx="199.609" cy="90.9992" rx="39.7949" ry="29.9992" fill="white" />
          <path
            d="M218.662 151.61C225.641 151.61 231.555 156.751 232.526 163.663L259.204 353.617C260.387 362.04 253.846 369.563 245.34 369.563H212.466C212.466 362.801 206.983 357.319 200.221 357.319C193.459 357.319 187.977 362.801 187.977 369.563H155.102C146.596 369.563 140.056 362.04 141.239 353.617L167.917 163.663C168.888 156.751 174.801 151.61 181.781 151.61H218.662ZM200.221 340.176C196.164 340.177 192.875 343.466 192.874 347.523C192.874 351.58 196.164 354.87 200.221 354.87C204.279 354.87 207.568 351.581 207.568 347.523C207.568 343.466 204.279 340.176 200.221 340.176Z"
            fill="white"
          />
        }
      }
    </svg>
  `,
  styles: `
    .mark {
      display: block;
      flex: 0 0 auto;
      width: var(--mark-size);
      height: var(--mark-size);
    }
  `,
})
export class GameLogo {
  readonly game = input.required<GameName>();
  /** Lado do tile em px. Abaixo de ~28px o glifo perde definição. */
  readonly size = input(56);

  protected readonly label = () =>
    ({ qlick: 'Tichr Qlick', wor: 'Tichr Wor', isolateus: 'Tichr Isolateus' })[this.game()];
}
