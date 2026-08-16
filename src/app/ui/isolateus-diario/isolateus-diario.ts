import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Acontecimento, TipoAcontecimento } from '../../core/models';
import { Icon } from '../icon/icon';

/** Ícone e cor por tipo de evento. */
const ESTILO: Record<TipoAcontecimento, { icone: string; cor: string }> = {
  NOITE: { icone: 'moon', cor: 'neutro' },
  SABOTAGEM: { icone: 'rachadura', cor: 'ruim' },
  ABDUCAO: { icone: 'nave', cor: 'ruim' },
  // Mesmo estilo do resto: 'REPELIDA' cobre a defesa bem-sucedida E o tiro às
  // cegas em setor vazio, e a UI não pode dar pistas de qual dos dois foi.
  REPELIDA: { icone: 'shield', cor: 'bom' },
  ESPERA: { icone: 'moon', cor: 'neutro' },
  REPARO: { icone: 'sparkles', cor: 'atencao' },
  RESTAURADO: { icone: 'check', cor: 'bom' },
  REPARO_FALHOU: { icone: 'x', cor: 'ruim' },
  QUARENTENA: { icone: 'alert', cor: 'atencao' },
  VEREDITO: { icone: 'lock', cor: 'atencao' },
  FIM: { icone: 'flag', cor: 'neutro' },
};

/**
 * O Diário da Vila: o histórico do que aconteceu, consultável a qualquer
 * momento (o card do Figma).
 *
 * Mais recente no topo. No mobile é uma gaveta recolhível; no telão, coluna
 * fixa. Ele não interpreta nada — só renderiza o que o backend registrou, que é
 * exatamente o que a vila inteira pode saber.
 */
@Component({
  selector: 'app-isolateus-diario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <section class="diario" [class.diario--aberto]="aberto()">
      <button class="cabeca" type="button" (click)="aberto.set(!aberto())">
        <app-icon name="scroll" [size]="16" />
        <span>Diário da vila</span>
        <span class="conta">{{ entradas().length }}</span>
      </button>

      @if (aberto()) {
        <ol class="lista">
          @for (a of entradas(); track a.id) {
            <li class="item" [class]="'item--' + a.cor">
              <span class="item__icone"><app-icon [name]="$any(a.icone)" [size]="14" /></span>
              <div class="item__corpo">
                <p class="item__texto">{{ a.texto }}</p>
                <span class="item__noite">Noite {{ a.noite + 1 }}</span>
              </div>
            </li>
          } @empty {
            <li class="vazio">Nada registrado ainda.</li>
          }
        </ol>
      }
    </section>
  `,
  styles: `
    :host { display: block; }

    .diario {
      background: var(--bg, #fff);
      border: 2px solid #b45309;
      box-shadow: 4px 4px 0 #b45309;
    }

    .cabeca {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.5rem 0.7rem;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: inherit;
      background: none;
      border: none;
      cursor: pointer;
    }
    .conta {
      margin-left: auto;
      font-size: 0.65rem;
      padding: 0.05rem 0.35rem;
      border: 1px solid currentColor;
    }

    .lista {
      list-style: none;
      margin: 0;
      padding: 0 0.7rem 0.7rem;
      max-height: 14rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .item {
      display: flex;
      gap: 0.45rem;
      padding: 0.4rem 0.5rem;
      border-left: 3px solid currentColor;
      background: var(--surface, #f8fafc);
    }
    .item--bom { color: #15803d; }
    .item--ruim { color: #dc2626; }
    .item--atencao { color: #b45309; }
    .item--neutro { color: var(--muted, #64748b); }

    .item__icone { line-height: 0; padding-top: 0.1rem; }
    .item__corpo { display: flex; flex-direction: column; gap: 0.1rem; }
    .item__texto { margin: 0; font-size: 0.75rem; color: var(--text, #0f172a); line-height: 1.35; }
    .item__noite { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

    .vazio { font-size: 0.75rem; color: var(--muted, #64748b); }
  `,
})
export class IsolateusDiario {
  readonly acontecimentos = input.required<Acontecimento[]>();
  /** No telão nasce aberto; no celular, recolhido para não comer a tela. */
  readonly aberto = signal(true);

  /** Mais recente no topo, já resolvido para ícone e cor. */
  protected readonly entradas = computed(() =>
    [...this.acontecimentos()].reverse().map((a) => ({
      ...a,
      icone: ESTILO[a.tipo]?.icone ?? 'info',
      cor: ESTILO[a.tipo]?.cor ?? 'neutro',
    })),
  );
}
