import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { setorDoMapa, vizinhosDe } from '../../core/isolateus-mapa';
import { Habitante, SetorVila } from '../../core/models';
import { Icon } from '../icon/icon';

/**
 * A visão do setor onde o jogador está (Protótipo 2): o ícone grande ao centro,
 * a fileira de habitantes presentes e as setas de deslocamento nas bordas.
 *
 * A fileira mostra **só quem está aqui**, sem histórico de quem passou — e reais
 * e NPCs aparecem idênticos, como em todo o resto do jogo.
 */
@Component({
  selector: 'app-isolateus-setor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <section
      class="setor"
      [class.setor--ruina]="!intacto()"
      [class.setor--reparo]="emReparo()"
      [class.setor--noite]="noite()"
    >
      <!-- Quem está aqui -->
      <div class="fileira">
        @for (h of presentes(); track h.id; let i = $index) {
          <span
            class="hab"
            [class.hab--eu]="h.id === meuHabitanteId()"
            [class.hab--indo]="h.id === abduzindoId()"
            [style.--atraso]="i * 40 + 'ms'"
          >
            <span class="hab__avatar"><app-icon name="user" [size]="16" /></span>
            <span class="hab__nome">{{ h.nome }}</span>
          </span>
        } @empty {
          <span class="vazio">Você está sozinho aqui.</span>
        }
      </div>

      <!-- O setor -->
      <div class="centro">
        <span class="centro__icone">
          <app-icon [name]="$any(icone())" [size]="72" />
          @if (!intacto()) {
            <span class="centro__rachadura"><app-icon name="rachadura" [size]="72" /></span>
          }
        </span>
        <h2 class="centro__nome">{{ nome() }}</h2>
        @if (emReparo()) {
          <span class="selo selo--reparo">Reparo em curso</span>
        } @else if (!intacto()) {
          <span class="selo selo--ruina">Em ruínas</span>
        }
      </div>

      <!-- As saídas -->
      @if (podeAndar()) {
        <div class="saidas">
          @for (v of saidas(); track v.id) {
            <button class="saida" type="button" (click)="andarPara.emit(v.id)">
              <app-icon name="chevron-down" [size]="18" />
              <span>{{ v.curto }}</span>
            </button>
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; }

    .setor {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.9rem;
      background: var(--bg, #fff);
      border: 2px solid var(--border, #cbd5e1);
      box-shadow: 4px 4px 0 var(--border, #cbd5e1);
    }
    .setor--noite { background: #1e293b; color: #e2e8f0; border-color: #475569; box-shadow: 4px 4px 0 #475569; }

    .setor--ruina {
      border-color: #dc2626;
      box-shadow: 4px 4px 0 #dc2626;
      background-image: repeating-linear-gradient(
        45deg, transparent 0 8px, rgba(220, 38, 38, 0.12) 8px 16px
      );
    }
    .setor--reparo { border-color: #d97706; box-shadow: 4px 4px 0 #d97706; animation: pulso 2s ease-in-out infinite; }

    .fileira { display: flex; flex-wrap: wrap; gap: 0.5rem; min-height: 3rem; }
    .hab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      /* Stagger: a fileira entra um a um, para o jogador ler quem está ali. */
      animation: entra 220ms ease-out both;
      animation-delay: var(--atraso, 0ms);
    }
    .hab__avatar {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: 2px solid currentColor;
      border-radius: 50%;
      color: var(--primary, #2563eb);
    }
    .hab--eu .hab__avatar { color: var(--iso, #65a30d); background: rgba(101, 163, 13, 0.12); }
    .hab__nome { font-size: 0.6rem; font-weight: 700; max-width: 4.5rem; text-align: center; }
    /* A vítima subindo pelo feixe da nave. */
    .hab--indo { animation: abduzido 1.2s ease-in forwards; }

    .vazio { font-size: 0.8rem; opacity: 0.7; }

    .centro { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 1rem 0; }
    .centro__icone { position: relative; line-height: 0; color: var(--iso, #65a30d); }
    .setor--ruina .centro__icone { color: #94a3b8; }
    .centro__rachadura { position: absolute; inset: 0; color: #dc2626; }
    .centro__nome {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .selo {
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.15rem 0.4rem;
      border: 1px solid currentColor;
    }
    .selo--ruina { color: #dc2626; }
    .selo--reparo { color: #d97706; }

    .saidas { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .saida {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.45rem 0.7rem;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 800;
      color: inherit;
      background: none;
      border: 2px solid var(--iso, #65a30d);
      cursor: pointer;
      transition: transform 120ms ease;
    }
    .saida:active { transform: scale(0.92); }

    @keyframes entra {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes abduzido {
      to { opacity: 0; transform: translateY(-60px) scale(0.6); }
    }
    @keyframes pulso {
      0%, 100% { border-color: #d97706; }
      50% { border-color: #fbbf24; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hab, .setor--reparo { animation: none; }
      .hab--indo { animation: some 200ms ease-out forwards; }
      .saida:active { transform: none; }
    }
    @keyframes some { to { opacity: 0; } }
  `,
})
export class IsolateusSetor {
  readonly setor = input.required<SetorVila>();
  /** A vila inteira; o componente filtra quem está neste setor. */
  readonly habitantes = input.required<Habitante[]>();
  readonly meuHabitanteId = input<string>('');
  readonly emReparo = input(false);
  readonly podeAndar = input(false);
  readonly noite = input(false);
  /** Habitante sendo levado pela nave agora (dispara a animação de abdução). */
  readonly abduzindoId = input<string | null>(null);

  readonly andarPara = output<string>();

  protected readonly nome = computed(() => this.setor().nome);
  protected readonly intacto = computed(() => this.setor().intacto);
  protected readonly icone = computed(
    () => setorDoMapa(this.setor().id)?.icone ?? 'building',
  );
  protected readonly saidas = computed(() => vizinhosDe(this.setor().id));

  /** Só quem está vivo, na vila e neste setor. */
  protected readonly presentes = computed(() =>
    this.habitantes().filter(
      (h) => h.vivo && !h.preso && h.setorId === this.setor().id,
    ),
  );
}
