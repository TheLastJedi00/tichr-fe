import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MAPA, SetorMapa, estradas } from '../../core/isolateus-mapa';
import { SetorVila } from '../../core/models';
import { Icon } from '../icon/icon';

/**
 * O mapa da vila, em visão de cima (Protótipo 1). **Somente leitura.**
 *
 * Mostra os 6 setores, as estradas e o estado de cada um. O que ele
 * deliberadamente **não** mostra é quem está onde: nenhum contador, nenhum
 * avatar fora do setor do próprio jogador. Essa informação é a moeda do jogo, e
 * exibi-la aqui esvaziaria a dedução inteira.
 *
 * Estado se comunica por **cor + borda + textura**, nunca só por cor — numa
 * turma de 30, daltonismo é praticamente garantido.
 */
@Component({
  selector: 'app-isolateus-mapa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="mapa" [class.mapa--noite]="noite()">
      <!-- As estradas ficam atrás de tudo, num SVG que cobre a grade inteira. -->
      <svg class="estradas" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
        @for (e of vias(); track e.chave) {
          <line
            [attr.x1]="e.x1" [attr.y1]="e.y1"
            [attr.x2]="e.x2" [attr.y2]="e.y2"
            class="via"
            [class.via--ativa]="e.ativa"
          />
        }
      </svg>

      @for (s of celulas(); track s.id) {
        <button
          class="setor"
          type="button"
          [style.grid-column]="s.col"
          [style.grid-row]="s.linha"
          [class.setor--ruina]="!s.intacto"
          [class.setor--reparo]="s.emReparo"
          [class.setor--aqui]="s.aqui"
          [class.setor--alcancavel]="s.alcancavel"
          [disabled]="!s.alcancavel"
          [attr.aria-label]="rotulo(s)"
          (click)="andarPara.emit(s.id)"
        >
          <span class="setor__icone">
            <app-icon [name]="$any(s.icone)" [size]="26" />
            @if (!s.intacto) {
              <span class="setor__rachadura"><app-icon name="rachadura" [size]="26" /></span>
            }
          </span>
          <span class="setor__nome">{{ s.curto }}</span>

          @if (s.aqui) {
            <span class="tag tag--aqui">Você está aqui</span>
          } @else if (s.emReparo) {
            <span class="tag tag--reparo">Reparo em curso</span>
          } @else if (!s.intacto) {
            <span class="tag tag--ruina">Em ruínas</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .mapa {
      position: relative;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 0.5rem;
      aspect-ratio: 4 / 3;
      padding: 0.5rem;
      background: var(--surface, #f1f5f9);
      border: 2px solid var(--border, #cbd5e1);
      box-shadow: 4px 4px 0 var(--border, #cbd5e1);
    }
    .mapa--noite { background: #0f172a; border-color: #334155; box-shadow: 4px 4px 0 #334155; }

    .estradas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .via { stroke: var(--border, #cbd5e1); stroke-width: 6; }
    .mapa--noite .via { stroke: #334155; }
    /* A estrada acende quando dá para andar por ela nesta noite. */
    .via--ativa { stroke: var(--iso, #65a30d); stroke-width: 8; }

    .setor {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.4rem;
      font: inherit;
      color: var(--text, #0f172a);
      background: var(--bg, #fff);
      border: 2px solid var(--border, #cbd5e1);
      cursor: default;
    }
    .mapa--noite .setor { background: #1e293b; color: #e2e8f0; border-color: #475569; }

    .setor__icone { position: relative; color: var(--iso, #65a30d); line-height: 0; }
    .setor__nome {
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: center;
    }

    /* Em ruínas: vermelho + hachura + rachadura. Três sinais, não só a cor. */
    .setor--ruina {
      border-color: #dc2626;
      background-image: repeating-linear-gradient(
        45deg,
        transparent 0 6px,
        rgba(220, 38, 38, 0.16) 6px 12px
      );
    }
    .setor--ruina .setor__icone { color: #94a3b8; }
    .setor__rachadura { position: absolute; inset: 0; color: #dc2626; }

    .setor--reparo { border-color: #d97706; animation: pulso 2s ease-in-out infinite; }
    .setor--aqui { outline: 3px solid var(--iso, #65a30d); outline-offset: 2px; }
    .setor--alcancavel { cursor: pointer; border-style: dashed; }
    .setor--alcancavel:hover { transform: translate(-1px, -1px); box-shadow: 2px 2px 0 var(--iso, #65a30d); }

    .tag {
      font-size: 0.55rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.1rem 0.3rem;
      border: 1px solid currentColor;
    }
    .tag--aqui { color: var(--iso, #65a30d); }
    .tag--ruina { color: #dc2626; }
    .tag--reparo { color: #d97706; }

    @keyframes pulso {
      0%, 100% { border-color: #d97706; }
      50% { border-color: #fbbf24; }
    }
    @media (prefers-reduced-motion: reduce) {
      .setor--reparo { animation: none; }
      .setor--alcancavel:hover { transform: none; }
    }
  `,
})
export class IsolateusMapa {
  /** Os setores como o backend os publica (id, nome, intacto). */
  readonly setores = input.required<SetorVila[]>();
  /** Onde o jogador está. Vazio = ele não é (mais) um habitante da vila. */
  readonly meuSetor = input<string>('');
  /** O setor com reparo declarado nesta noite. */
  readonly reparoEm = input<string | null>(null);
  /** Só na janela de deslocamento as setas/atalhos ficam clicáveis. */
  readonly podeAndar = input(false);
  readonly noite = input(false);

  readonly andarPara = output<string>();

  protected readonly celulas = computed(() => {
    const estado = new Map(this.setores().map((s) => [s.id, s]));
    const vizinhos = new Set(
      this.podeAndar()
        ? (MAPA.find((s) => s.id === this.meuSetor())?.vizinhos ?? [])
        : [],
    );
    return MAPA.map((m) => ({
      ...m,
      intacto: estado.get(m.id)?.intacto ?? true,
      emReparo: this.reparoEm() === m.id,
      aqui: this.meuSetor() === m.id,
      alcancavel: vizinhos.has(m.id),
    }));
  });

  /** As estradas em coordenadas do viewBox (grade 4×3 → 400×300). */
  protected readonly vias = computed(() => {
    const alcancaveis = new Set(
      this.celulas().filter((c) => c.alcancavel).map((c) => c.id),
    );
    const meu = this.meuSetor();
    return estradas().map(([a, b]) => ({
      chave: `${a.id}|${b.id}`,
      x1: this.cx(a),
      y1: this.cy(a),
      x2: this.cx(b),
      y2: this.cy(b),
      // Acende só a estrada que sai de onde o jogador está.
      ativa:
        (a.id === meu && alcancaveis.has(b.id)) ||
        (b.id === meu && alcancaveis.has(a.id)),
    }));
  });

  private cx(s: SetorMapa): number {
    return (s.col - 0.5) * 100;
  }
  private cy(s: SetorMapa): number {
    return (s.linha - 0.5) * 100;
  }

  protected rotulo(s: { curto: string; intacto: boolean; aqui: boolean; alcancavel: boolean }): string {
    const estado = s.intacto ? 'intacto' : 'em ruínas';
    if (s.aqui) return `${s.curto}, ${estado}. Você está aqui.`;
    if (s.alcancavel) return `Ir para ${s.curto}, ${estado}.`;
    return `${s.curto}, ${estado}.`;
  }
}
