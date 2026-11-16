import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NomeIcone,
  medidasIcone,
  pixelsDoIcone,
} from '../../isolateus/isolateus-icones';

/**
 * Um ícone pixel art do Isolateus (spec 034 #62, #70): matriz de pixels na
 * paleta única, desenhada como SVG `crispEdges`. Dumb: só recebe o nome.
 */
@Component({
  selector: 'app-icone-pixel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + medidas().w + ' ' + medidas().h"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      @for (p of pixels(); track $index) {
        <rect [attr.x]="p.x" [attr.y]="p.y" width="1" height="1" [attr.fill]="p.cor" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-block; vertical-align: middle; line-height: 0; }
    svg { display: block; width: 100%; height: auto; }
  `,
})
export class IconePixel {
  readonly nome = input.required<NomeIcone>();
  protected readonly medidas = computed(() => medidasIcone(this.nome()));
  protected readonly pixels = computed(() => pixelsDoIcone(this.nome()));
}
