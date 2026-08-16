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
      <!--
        A nave só desce para quem está NO setor da abdução. Nos outros setores o
        jogador recebe apenas o card e o diário: você vê o que acontece perto de
        você; o resto você lê no rádio.
      -->
      @if (abduzindoId()) {
        <div class="nave" aria-hidden="true">
          <span class="nave__disco"><app-icon name="nave" [size]="48" /></span>
          <span class="nave__feixe"></span>
        </div>
      }

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

    /* --- A nave (Protótipo 3) --- */
    .nave {
      position: absolute;
      top: -0.5rem;
      left: 50%;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--iso, #65a30d);
      pointer-events: none;
      /* Chega, paira sobre a fileira e vai embora — 2,4s no total. */
      animation: naveEntra 2400ms ease-in-out forwards;
    }
    .nave__disco { line-height: 0; filter: drop-shadow(0 0 8px rgba(101, 163, 13, 0.6)); }
    .nave__feixe {
      width: 2.2rem;
      height: 3.2rem;
      background: linear-gradient(
        to bottom,
        rgba(101, 163, 13, 0.55),
        rgba(101, 163, 13, 0)
      );
      clip-path: polygon(30% 0, 70% 0, 100% 100%, 0 100%);
      animation: feixe 2400ms ease-in-out forwards;
    }

    @keyframes naveEntra {
      0% { opacity: 0; transform: translate(-50%, -80px); }
      20% { opacity: 1; transform: translate(-50%, 0); }
      70% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(220px, -120px) scale(0.4); }
    }
    @keyframes feixe {
      0%, 15% { opacity: 0; transform: scaleY(0); transform-origin: top; }
      30%, 65% { opacity: 1; transform: scaleY(1); transform-origin: top; }
      80%, 100% { opacity: 0; transform: scaleY(0); transform-origin: top; }
    }

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
      .nave { animation: some 400ms ease-out forwards; }
      .nave__feixe { display: none; }
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
