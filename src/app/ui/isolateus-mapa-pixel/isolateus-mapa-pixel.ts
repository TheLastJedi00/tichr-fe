import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MAPA, SetorMapa, estradas } from '../../core/isolateus-mapa';

interface Predio {
  id: string;
  curto: string;
  x: number;
  y: number;
  intacto: boolean;
  aqui: boolean;
  brilha: boolean;
  janelas: Array<{ x: number; acesa: boolean }>;
}

/** As células do mapa da vila (mesma grade da prévia da spec 034). */
const CW = 26;
const CH = 18;
const OX = 4;
const OY = 4;
const BW = 18;
const BH = 12;

/**
 * O mapa da vila em pixel art (spec 034 #18, #36): SVG gerado a partir da
 * malha `MAPA`, com `shape-rendering: crispEdges` — nunca diverge da malha.
 * Serve de minimapa (canto da tela) e de mapa expandido. Dumb.
 */
@Component({
  selector: 'app-isolateus-mapa-pixel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + largura + ' ' + altura()"
      shape-rendering="crispEdges"
      role="img"
      aria-label="Mapa da vila"
    >
      <rect [attr.width]="largura" [attr.height]="altura()" fill="#0a1122" />
      @for (e of estradasSvg(); track $index) {
        <rect [attr.x]="e.x" [attr.y]="e.y" [attr.width]="e.w" [attr.height]="e.h" fill="#475569" />
        @for (t of e.tracos; track $index) {
          <rect [attr.x]="t" [attr.y]="e.y + 1" width="2" height="1" fill="#64748b" />
        }
      }
      @for (b of predios(); track b.id) {
        <rect [attr.x]="b.x" [attr.y]="b.y + 2" [attr.width]="18" [attr.height]="10" [attr.fill]="b.intacto ? '#475569' : '#7f1d1d'" />
        <rect [attr.x]="b.x - 1" [attr.y]="b.y" [attr.width]="20" height="2" [attr.fill]="b.intacto ? '#64748b' : '#b91c1c'" />
        @for (j of b.janelas; track $index) {
          <rect [attr.x]="j.x" [attr.y]="b.y + 4" width="2" height="2" [attr.fill]="b.intacto ? (j.acesa ? '#d9b45a' : '#3a3220') : '#05070f'" />
        }
        @if (!b.intacto) {
          <rect [attr.x]="b.x + 4" [attr.y]="b.y + 3" width="1" height="3" fill="#05070f" />
          <rect [attr.x]="b.x + 5" [attr.y]="b.y + 6" width="1" height="3" fill="#05070f" />
          <rect [attr.x]="b.x + 13" [attr.y]="b.y + 2" width="1" height="4" fill="#39ff88" />
        }
        @if (b.brilha) {
          <rect [attr.x]="b.x - 1" [attr.y]="b.y + 12" [attr.width]="20" height="1" fill="#39ff88" />
        }
        @if (b.aqui) {
          <g class="aqui">
            <rect [attr.x]="b.x - 2" [attr.y]="b.y - 2" [attr.width]="22" height="1" fill="#fcd34d" />
            <rect [attr.x]="b.x - 2" [attr.y]="b.y + 13" [attr.width]="22" height="1" fill="#fcd34d" />
            <rect [attr.x]="b.x - 2" [attr.y]="b.y - 2" width="1" height="16" fill="#fcd34d" />
            <rect [attr.x]="b.x + 19" [attr.y]="b.y - 2" width="1" height="16" fill="#fcd34d" />
          </g>
        }
        @if (grande()) {
          <text
            [attr.x]="b.x + 9"
            [attr.y]="b.y + 16.4"
            text-anchor="middle"
            font-family="Pixelify Sans, sans-serif"
            font-size="3"
            [attr.fill]="b.aqui ? '#fcd34d' : '#cbd5e1'"
          >{{ b.curto }}</text>
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { display: block; width: 100%; height: auto; }
    .aqui { animation: piscar 0.9s steps(2) infinite; }
    @keyframes piscar { 50% { opacity: 0.25; } }
  `,
})
export class IsolateusMapaPixel {
  /** Os setores intactos (id → intacto). Sem o id, vale intacto. */
  readonly setores = input.required<Array<{ id: string; intacto: boolean }>>();
  readonly meuSetor = input<string | null>(null);
  readonly brilhando = input<string[]>([]);
  /** Mapa expandido (com os nomes dos setores). */
  readonly grande = input(false);

  protected readonly largura = 4 * CW + 2;
  protected readonly altura = computed(() => (this.grande() ? 46 : 38));

  protected readonly predios = computed<Predio[]>(() =>
    MAPA.map((s: SetorMapa) => {
      const x = OX + (s.col - 1) * CW;
      const y = OY + (s.linha - 1) * CH;
      const intacto = this.setores().find((v) => v.id === s.id)?.intacto ?? true;
      return {
        id: s.id,
        curto: s.curto.toUpperCase(),
        x,
        y,
        intacto,
        aqui: s.id === this.meuSetor(),
        brilha: this.brilhando().includes(s.id),
        janelas: [0, 1, 2, 3].map((i) => ({ x: x + 2 + i * 4, acesa: i % 2 === 1 })),
      };
    }),
  );

  /** As estradas da malha (pares únicos): nunca divergem de `MAPA`. */
  protected readonly estradasSvg = computed(() =>
    estradas().map(([a, b]) => {
      const ax = OX + (a.col - 1) * CW + BW / 2;
      const ay = OY + (a.linha - 1) * CH + BH / 2;
      const bx = OX + (b.col - 1) * CW + BW / 2;
      const by = OY + (b.linha - 1) * CH + BH / 2;
      if (ay === by) {
        const x = Math.min(ax, bx);
        const w = Math.abs(bx - ax);
        const tracos: number[] = [];
        for (let t = x; t < x + w; t += 4) tracos.push(t);
        return { x, y: ay - 1, w, h: 2, tracos };
      }
      return { x: ax - 1, y: Math.min(ay, by), w: 2, h: Math.abs(by - ay), tracos: [] };
    }),
  );
}
