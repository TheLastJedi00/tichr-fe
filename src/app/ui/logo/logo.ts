import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Marca do Tichr (dumb). Única fonte da verdade do logo — nenhuma tela deve
 * desenhar a marca por conta própria.
 *
 * **Variante única.** O símbolo é um tile autossuficiente: campo com gradiente
 * azul (#2563eb → #153885) e glifo branco com folga da borda. O tile tem
 * silhueta própria, então recorta em qualquer superfície — clara ou escura — sem
 * precisar do par claro/escuro que a marca antiga (glifo sangrando até a borda)
 * exigia. É o mesmo princípio dos logos dos jogos.
 *
 * **`lockup` (símbolo + "Tichr") é o padrão** — é a repetição do par que ensina o
 * usuário a reconhecer o símbolo sozinho depois. `mark` fica para onde o contexto já
 * diz o nome (favicon, ícone de app, avatar). A palavra é texto e acompanha o
 * `currentColor` do contexto — some/clareia junto com a superfície onde é aplicada.
 *
 * O gradiente precisa de `id` único por instância: id de SVG é global no documento
 * e, com o mesmo id, todas as instâncias resolveriam para o primeiro gradiente.
 * Aqui são idênticos, então colidir seria inofensivo visualmente — mas id duplicado
 * é HTML inválido, daí o contador por instância.
 */
let logoUid = 0;

@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="logo"
      [style.--logo-size.px]="size()"
      [attr.role]="variant() === 'mark' ? 'img' : null"
      [attr.aria-label]="variant() === 'mark' ? 'Tichr' : null"
    >
      <svg
        class="logo__mark"
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="400" height="400" rx="80" [attr.fill]="'url(#' + gradId + ')'" />
        <path
          d="M267 277C267 252.147 287.147 232 312 232H322C346.853 232 367 252.147 367 277V337C367 361.853 346.853 382 322 382H312C287.147 382 267 361.853 267 337V277Z"
          fill="#ffffff"
        />
        <circle cx="317" cy="188" r="35" fill="#ffffff" />
        <path
          d="M385 80.4996C383.598 109.957 359.433 133.191 329.943 133.436L262 134C262 134 243.789 134 234 144C224.029 154.187 224 171.899 224 172V313.472C224 353.753 190.766 386.095 150.5 385C110.235 386.095 77.0004 353.753 77.0004 313.472V172C77.0003 171.898 76.9721 153.971 67.0004 144C57.0258 134.025 39.0916 134 39.0004 134C25.78 134 15.0958 123.22 15.2127 110.001L15.4657 81.4112C15.4888 78.8071 15.7069 76.2084 16.1184 73.6369L16.3092 72.4442C21.6047 39.3473 50.1578 14.9996 83.6756 14.9996H196L296.5 14.4996H315.408C352.463 14.4996 383.038 43.4967 385 80.4996ZM150.5 128C119.296 128 94.0006 153.296 94.0004 184.5V312.5C94.0004 343.704 119.296 369 150.5 369C181.704 368.999 207 343.704 207 312.5V184.5C207 153.296 181.704 128 150.5 128ZM151 40.9996C129.461 40.9996 112.001 58.4607 112 79.9996C112 101.539 129.461 119 151 119C172.539 118.999 190 101.539 190 79.9996C190 58.4608 172.539 40.9998 151 40.9996Z"
          fill="#ffffff"
        />
        <defs>
          <linearGradient
            [attr.id]="gradId"
            x1="1"
            y1="0"
            x2="399"
            y2="400"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#2563eb" />
            <stop offset="1" stop-color="#153885" />
          </linearGradient>
        </defs>
      </svg>

      @if (variant() === 'lockup') {
        <span class="logo__word">Tichr</span>
      }
    </span>
  `,
  styles: `
    .logo {
      display: inline-flex;
      align-items: center;
      /* Respiro proporcional ao símbolo: a marca nunca encosta no que vem depois. */
      gap: calc(var(--logo-size) * 0.3);
      color: inherit;
      user-select: none;
    }
    .logo__mark {
      flex: 0 0 auto;
      width: var(--logo-size);
      height: var(--logo-size);
    }
    .logo__word {
      font-weight: 800;
      /* Proporção travada ao símbolo: o lockup escala como uma peça só. */
      font-size: calc(var(--logo-size) * 0.68);
      line-height: 1;
      letter-spacing: -0.02em;
      /* A palavra é texto, não símbolo: acompanha a cor do contexto. */
      color: currentColor;
      white-space: nowrap;
    }
  `,
})
export class Logo {
  /** Lado do símbolo em px. O texto do lockup escala junto. Mínimo legível: 20px. */
  readonly size = input(32);
  /** `lockup` = símbolo + palavra (padrão). `mark` = só o símbolo. */
  readonly variant = input<'lockup' | 'mark'>('lockup');

  /** Id único do gradiente por instância — id de SVG é global no documento. */
  readonly gradId = `tichr-logo-grad-${logoUid++}`;
}
