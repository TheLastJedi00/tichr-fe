import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Marca do Tichr (dumb). Única fonte da verdade do logo — nenhuma tela deve
 * desenhar a marca por conta própria.
 *
 * **Por que duas variantes e não uma.** O glifo sangra até a borda do tile (a barra
 * do "T" atravessa a largura inteira), então o tile não tem silhueta própria: quem
 * a define é o contraste com o campo. Aplicar a White OL (campo azul, glifo branco)
 * sobre superfície clara faz o contorno branco e a barra do "T" se fundirem com a
 * página — o "T" some e sobra um par de barras azuis soltas. Daí o par:
 *
 *   claro  → Blue OL  (campo branco, glifo + contorno azuis)
 *   escuro → White OL (campo azul, glifo + contorno brancos)
 *
 * Os dois tokens vêm do tema (`--logo-field` / `--logo-glyph`, em styles.scss), e
 * `onDark` força a variante escura onde a superfície é escura independente do tema
 * (hero da landing, header do Portal do Aluno). O azul #2563eb é o mesmo nas duas e
 * **não** acompanha o `--primary`: é a constante que torna a marca reconhecível.
 *
 * **`lockup` (símbolo + "Tichr") é o padrão** — é a repetição do par que ensina o
 * usuário a reconhecer o símbolo sozinho depois. `mark` fica para onde o contexto já
 * diz o nome (favicon, ícone de app, avatar).
 *
 * O recorte dos cantos é CSS (`clip-path: inset(... round ...)`) e não `<clipPath id>`:
 * id de SVG é global no documento e várias instâncias na mesma página colidiriam.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="logo"
      [class.logo--on-dark]="onDark()"
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
        <rect width="400" height="400" rx="50" fill="var(--logo-field)" />
        <path d="M77 0H177H400V100H177V400H77V100H0V0H77Z" fill="var(--logo-glyph)" />
        <path d="M234 250H334V400H234V250Z" fill="var(--logo-glyph)" />
        <circle cx="284" cy="176" r="50" fill="var(--logo-glyph)" />
        <!-- O contorno é o que dá silhueta ao tile quando o campo some no fundo. -->
        <rect
          x="5"
          y="5"
          width="390"
          height="390"
          rx="45"
          fill="none"
          stroke="var(--logo-glyph)"
          stroke-width="10"
        />
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
    /* Superfície escura fixa (hero da landing, header do aluno): White OL sempre,
       mesmo no tema claro. */
    .logo--on-dark {
      --logo-field: #2563eb;
      --logo-glyph: #ffffff;
    }
    .logo__mark {
      flex: 0 0 auto;
      width: var(--logo-size);
      height: var(--logo-size);
      /* rx=50 em 400 = 12.5% — o arredondamento acompanha a escala. */
      clip-path: inset(0 round 12.5%);
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
  /** Superfície escura independente do tema — força a variante White OL. */
  readonly onDark = input(false);
}
