import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { setorDoMapa, vizinhosDe } from '../../core/isolateus-mapa';
import { DeslocamentoNoite, Habitante, SetorVila } from '../../core/models';
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
      [class.setor--brilho]="brilhando()"
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

      <!-- Quem chegou e quem partiu no amanhecer (026 §4.2) -->
      <div class="aviso-mov-regiao" aria-live="polite">
        @if (aviso(); as a) {
          <div class="aviso-mov" [class.aviso-mov--some]="avisoSaindo()">
            <span class="aviso-mov__icone"><app-icon name="users" [size]="16" /></span>
            <span class="aviso-mov__texto">
              @if (a.linhas.length <= 3) {
                @for (l of a.linhas; track $index) {
                  <span><b>{{ l.nome }}</b> {{ l.texto }}</span>
                }
              } @else {
                <span><b>{{ a.resumo }}</b></span>
                <button
                  class="aviso-mov__mais"
                  type="button"
                  [attr.aria-expanded]="avisoAberto()"
                  (click)="alternarAviso()"
                >
                  {{ avisoAberto() ? 'Esconder' : 'Ver quem' }}
                </button>
                @if (avisoAberto()) {
                  <ul>
                    @for (l of a.linhas; track $index) {
                      <li><b>{{ l.nome }}</b> {{ l.texto }}</li>
                    }
                  </ul>
                }
              }
            </span>
            <button class="aviso-mov__fechar" type="button" aria-label="Fechar aviso" (click)="fecharAviso()">
              <app-icon name="x" [size]="14" />
            </button>
          </div>
        }
      </div>

      <!-- Quem está aqui -->
      <div class="fileira">
        @for (h of fileira(); track h.id; let i = $index) {
          <span
            class="hab"
            [attr.data-hab]="h.id"
            [attr.data-para]="saidaDe(h.id)"
            [class.hab--eu]="h.id === meuHabitanteId()"
            [class.hab--indo]="h.id === abduzindoId()"
            [class.hab--saindo]="!!saidaDe(h.id)"
            [class.hab--sem-entrada]="semEntrada().has(h.id)"
            [style.--atraso]="i * 40 + 'ms'"
            [attr.role]="h.id === meuHabitanteId() ? 'button' : null"
            [attr.tabindex]="h.id === meuHabitanteId() ? 0 : null"
            [attr.aria-label]="h.id === meuHabitanteId() ? 'Abrir meu personagem' : null"
            (click)="h.id === meuHabitanteId() && selecionarProprio.emit()"
            (keydown.enter)="h.id === meuHabitanteId() && selecionarProprio.emit()"
          >
            <span class="hab__avatar">
              <app-icon name="user" [size]="16" />
              @if (h.id === meuHabitanteId() && meuPonto()) { <span class="hab__ponto" aria-hidden="true"></span> }
            </span>
            <span class="hab__nome">{{ h.id === meuHabitanteId() && ocultarMeuNome() ? MASCARA : h.nome }}</span>
            <!-- Espaço fixo: o aviso aparece sem empurrar a fileira. -->
            <span class="hab__slot">
              @if (saidaDe(h.id); as para) {
                <span class="hab__aviso">
                  <app-icon name="arrow-right" [size]="9" />{{ curto(para) }}
                </span>
              }
            </span>
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
        @if (brilhando()) {
          <span class="selo selo--brilho">Brilho misterioso</span>
        }
        @if (emReparo()) {
          <span class="selo selo--reparo">Reparo em curso</span>
        } @else if (!intacto()) {
          <span class="selo selo--ruina">Em ruínas</span>
        }
      </div>

      <!--
        As saídas. Fora da noite (ou depois de andar) viram estradas: não se
        clica nelas, mas continuam ali como origem e destino das animações do
        amanhecer (026 §4.2).
      -->
      <div class="saidas">
        @for (v of saidas(); track v.id) {
          <button
            class="saida"
            type="button"
            [attr.data-setor]="v.id"
            [class.saida--estrada]="!podeAndar()"
            [class.saida--fluxo]="!!contagem()[v.id]"
            [disabled]="!podeAndar()"
            [attr.aria-label]="v.curto + (contagem()[v.id] ? ', ' + contagem()[v.id] + ' saindo por aqui' : '')"
            (click)="podeAndar() && andarPara.emit(v.id)"
          >
            <app-icon name="chevron-down" [size]="18" />
            <span>{{ v.curto }}</span>
            @if (contagem()[v.id]; as n) {
              <span class="saida__contador" aria-hidden="true">{{ n }}</span>
            }
          </button>
        }
      </div>
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
    .hab--eu { cursor: pointer; }
    .hab__avatar { position: relative; }
    .hab__ponto { position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; border-radius: 999px; background: var(--danger); }
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
    .setor--brilho { border-color: #eab308; box-shadow: 4px 4px 0 #eab308; }
    .selo--brilho { color: #a16207; }

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

    /* ===== Movimentação em tempo real (026) ===== */
    .setor { --transito: #fbbf24; --transito-ink: #0f172a; }
    .saida { position: relative; }

    /* Chegada animada pelo JS: sem o "entra" do CSS por cima. */
    .hab--sem-entrada { animation: none; }
    .hab__slot { min-height: 0.95rem; display: flex; align-items: center; }
    /* "→ Energia": o aviso de saída, abaixo do codinome. */
    .hab__aviso {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0 0.3rem;
      font-size: 0.55rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
      color: var(--transito-ink);
      background: var(--transito);
      border: 1px solid var(--transito-ink);
      animation: pop 150ms ease-out both;
    }
    /* De pé para sair: o avatar se inclina para a estrada do destino.
       --dx/--dy vêm do componente (vetor até a saída, normalizado em 6px). */
    .hab .hab__avatar { transition: transform 200ms ease, border-color 200ms ease; }
    .hab--saindo .hab__avatar {
      transform: translate(var(--dx, 0), var(--dy, 0));
      border-color: var(--transito);
      border-style: dashed;
    }
    /* A estrada com gente saindo: borda em trânsito e contador. */
    .saida--fluxo { border-color: var(--transito); animation: fluxo 1.2s ease-in-out infinite; }
    .saida__contador {
      position: absolute;
      top: -0.6rem;
      right: -0.6rem;
      min-width: 1.15rem;
      height: 1.15rem;
      padding: 0 0.2rem;
      display: grid;
      place-items: center;
      font-size: 0.65rem;
      font-weight: 900;
      line-height: 1;
      color: var(--transito-ink);
      background: var(--transito);
      border: 2px solid var(--transito-ink);
      box-shadow: 2px 2px 0 var(--transito-ink);
      animation: pop 150ms ease-out both;
    }
    /* Fora da noite (ou depois de andar): estrada, não botão. */
    .saida--estrada { cursor: default; border-style: dashed; opacity: 0.6; }
    .saida--estrada:active { transform: none; }

    /* O aviso compacto do amanhecer. */
    .aviso-mov-regiao:empty { display: none; }
    .aviso-mov {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0.6rem;
      font-size: 0.75rem;
      line-height: 1.35;
      color: var(--text, #0f172a);
      background: var(--surface, #fff);
      border: 2px solid var(--text, #0f172a);
      box-shadow: 3px 3px 0 var(--text, #0f172a);
      animation: desce 220ms ease-out both;
    }
    .aviso-mov--some { animation: sobe 200ms ease-in both; }
    .aviso-mov__icone { line-height: 0; color: var(--warning, #d97706); margin-top: 0.1rem; }
    .aviso-mov__texto { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
    .aviso-mov__texto ul { margin: 0.2rem 0 0; padding-left: 1rem; }
    .aviso-mov__mais {
      padding: 0;
      font: inherit;
      font-size: 0.7rem;
      font-weight: 800;
      text-align: left;
      text-decoration: underline;
      color: var(--primary, #2563eb);
      background: none;
      border: 0;
      cursor: pointer;
    }
    .aviso-mov__fechar { padding: 0; line-height: 0; color: var(--text-muted, #64748b); background: none; border: 0; cursor: pointer; }

    @keyframes pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
    @keyframes fluxo { 0%, 100% { border-color: var(--transito); } 50% { border-color: #b45309; } }
    @keyframes desce { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    @keyframes sobe { to { opacity: 0; transform: translateY(-6px); } }

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
      .hab__aviso, .saida__contador, .aviso-mov, .aviso-mov--some { animation-duration: 1ms; }
      .saida--fluxo { animation: none; }
      .hab--saindo .hab__avatar { transform: none; }
    }
    @keyframes some { to { opacity: 0; } }
  `,
})
export class IsolateusSetor {
  readonly setor = input.required<SetorVila>();
  /** A vila inteira; o componente filtra quem está neste setor. */
  readonly habitantes = input.required<Habitante[]>();
  readonly meuHabitanteId = input<string>('');
  /** O jogador escondeu o próprio codinome (o olho): o marcador "você" fica sem nome. */
  readonly ocultarMeuNome = input(false);
  /** Ponto discreto no meu avatar: há novidade no meu popup. */
  readonly meuPonto = input(false);
  protected readonly MASCARA = '••••••';
  readonly emReparo = input(false);
  /** O setor irradiou o brilho misterioso na noite que acabou. */
  readonly brilhando = input(false);
  readonly podeAndar = input(false);
  readonly noite = input(false);
  /** Habitante sendo levado pela nave agora (dispara a animação de abdução). */
  readonly abduzindoId = input<string | null>(null);

  readonly andarPara = output<string>();
  /** Toquei no meu próprio avatar: a página abre o popup do personagem. */
  readonly selecionarProprio = output<void>();

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

  // ===== Movimentação em tempo real (026) =====

  /** Os avisos de saída da noite, já recortados para este setor pela página. */
  readonly saidasNoite = input<DeslocamentoNoite[]>([]);
  /**
   * Quem saiu e quem chegou no amanhecer, já recortado (e sem o próprio
   * aluno). Toca uma vez por `rodada`; `null` = nada a animar.
   */
  readonly movimentosAmanhecer = input<MovimentosSetor | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly saidaPorHab = computed(
    () => new Map(this.saidasNoite().map((d) => [d.habitanteId, d.para])),
  );
  /** Quantos deste setor saem por cada estrada. */
  protected readonly contagem = computed(() => {
    const n: Record<string, number> = {};
    for (const d of this.saidasNoite()) n[d.para] = (n[d.para] ?? 0) + 1;
    return n;
  });

  /** Durante a animação do amanhecer, a fileira mostrada é controlada aqui. */
  private readonly exibidos = signal<Array<{ id: string; nome: string }> | null>(null);
  protected readonly fileira = computed(() => this.exibidos() ?? this.presentes());
  protected readonly semEntrada = signal<ReadonlySet<string>>(new Set());

  protected readonly aviso = signal<AvisoMovimento | null>(null);
  protected readonly avisoAberto = signal(false);
  protected readonly avisoSaindo = signal(false);
  private avisoTimer: ReturnType<typeof setTimeout> | undefined;
  private rodadaAnimada: number | null = null;

  constructor() {
    // A inclinação de quem está de saída aponta para a estrada de verdade:
    // depende do layout, então é medida depois de cada render.
    afterRenderEffect(() => {
      this.saidasNoite();
      this.fileira();
      const raiz = this.host.nativeElement;
      raiz.querySelectorAll<HTMLElement>('.hab[data-para]').forEach((el) => {
        const d = this.delta(el, el.dataset['para']!);
        const len = Math.hypot(d.x, d.y) || 1;
        el.style.setProperty('--dx', `${((d.x / len) * INCLINA_PX).toFixed(1)}px`);
        el.style.setProperty('--dy', `${((d.y / len) * INCLINA_PX).toFixed(1)}px`);
      });
    });

    effect(() => {
      const mov = this.movimentosAmanhecer();
      if (!mov || mov.rodada === this.rodadaAnimada) return;
      this.rodadaAnimada = mov.rodada;
      untracked(() => void this.tocarAmanhecer(mov));
    });

    this.destroyRef.onDestroy(() => clearTimeout(this.avisoTimer));
  }

  protected saidaDe(id: string): string | null {
    return this.saidaPorHab().get(id) ?? null;
  }

  protected curto(setorId: string): string {
    return setorDoMapa(setorId)?.curto ?? setorId;
  }

  /**
   * O amanhecer: a fileira volta ao estado da noite (reconstruído dos
   * movimentos, já que esta instância pode ter nascido agora), quem saiu
   * desliza até a estrada do destino, quem ficou escorrega para o buraco, quem
   * chegou entra pela estrada da origem e, por fim, o aviso compacto.
   */
  private async tocarAmanhecer(mov: MovimentosSetor): Promise<void> {
    const reduz = movimentoReduzido();
    const chegando = new Set(mov.chegaram.map((m) => m.id));
    this.exibidos.set([
      ...this.presentes()
        .filter((h) => !chegando.has(h.id))
        .map((h) => ({ id: h.id, nome: h.nome })),
      ...mov.sairam.map((m) => ({ id: m.id, nome: m.nome })),
    ]);
    this.semEntrada.set(new Set(this.fileira().map((h) => h.id)));
    await this.proximoRender();

    // 1. Saídas.
    await Promise.all(
      mov.sairam.map((m, i) => {
        const el = this.hab(m.id);
        if (!el) return Promise.resolve();
        const d = this.delta(el, m.para);
        return el
          .animate(
            reduz
              ? [{ opacity: 1 }, { opacity: 0 }]
              : [
                  { transform: 'none', opacity: 1 },
                  { transform: `translate(${d.x}px, ${d.y}px) scale(0.55)`, opacity: 0 },
                ],
            {
              duration: reduz ? 150 : T_SAIDA,
              delay: reduz ? 0 : i * T_ESCALONA,
              easing: 'cubic-bezier(.5,0,.75,0)',
              fill: 'forwards',
            },
          )
          .finished.then(() => undefined);
      }),
    );

    // 2. Quem ficou escorrega (FLIP) e quem chegou entra pela estrada da origem.
    const antes = this.medirFileira();
    this.semEntrada.set(new Set([...this.semEntrada(), ...chegando]));
    this.exibidos.set(null);
    await this.proximoRender();
    if (!reduz) {
      for (const [id, r] of antes) {
        const el = this.hab(id);
        if (!el || chegando.has(id)) continue;
        const agora = el.getBoundingClientRect();
        const dx = r.left - agora.left;
        const dy = r.top - agora.top;
        if (dx || dy) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: 220,
            easing: 'ease-out',
          });
        }
      }
    }
    await Promise.all(
      mov.chegaram.map((m, i) => {
        const el = this.hab(m.id);
        if (!el) return Promise.resolve();
        const d = this.delta(el, m.de);
        return el
          .animate(
            reduz
              ? [{ opacity: 0 }, { opacity: 1 }]
              : [
                  { transform: `translate(${d.x}px, ${d.y}px) scale(0.55)`, opacity: 0 },
                  { transform: 'none', opacity: 1 },
                ],
            {
              duration: reduz ? 150 : T_CHEGADA,
              delay: reduz ? 0 : i * T_ESCALONA,
              easing: 'cubic-bezier(.16,1,.3,1)',
              fill: 'backwards',
            },
          )
          .finished.then(() => undefined);
      }),
    );

    // 3. O aviso compacto.
    this.mostrarAviso(mov);
  }

  private mostrarAviso(mov: MovimentosSetor): void {
    const linhas = [
      ...mov.chegaram.map((m) => ({ nome: m.nome, texto: `chegou do ${m.deNome}.` })),
      ...mov.sairam.map((m) => ({ nome: m.nome, texto: `partiu para o ${m.paraNome}.` })),
    ];
    if (!linhas.length) return;
    const conta = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
    const partes = [
      mov.chegaram.length ? conta(mov.chegaram.length, 'chegou', 'chegaram') : '',
      mov.sairam.length ? conta(mov.sairam.length, 'partiu', 'partiram') : '',
    ].filter(Boolean);
    this.avisoAberto.set(false);
    this.avisoSaindo.set(false);
    this.aviso.set({ linhas, resumo: `${partes.join(', ')}.` });
    clearTimeout(this.avisoTimer);
    this.avisoTimer = setTimeout(() => this.fecharAviso(), T_AVISO);
  }

  protected alternarAviso(): void {
    this.avisoAberto.update((v) => !v);
    // Expandido, o aviso fica até o X.
    clearTimeout(this.avisoTimer);
  }

  protected fecharAviso(): void {
    clearTimeout(this.avisoTimer);
    if (movimentoReduzido()) {
      this.aviso.set(null);
      return;
    }
    this.avisoSaindo.set(true);
    this.avisoTimer = setTimeout(() => this.aviso.set(null), 200);
  }

  private proximoRender(): Promise<void> {
    return new Promise((ok) => afterNextRender(() => ok(), { injector: this.injector }));
  }

  private hab(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`.hab[data-hab="${id}"]`);
  }

  private medirFileira(): Map<string, DOMRect> {
    const m = new Map<string, DOMRect>();
    this.host.nativeElement
      .querySelectorAll<HTMLElement>('.hab[data-hab]')
      .forEach((el) => m.set(el.dataset['hab']!, el.getBoundingClientRect()));
    return m;
  }

  /** Vetor do centro de `el` até o centro da estrada de `setorId`. */
  private delta(el: HTMLElement, setorId: string): { x: number; y: number } {
    const estrada = this.host.nativeElement.querySelector<HTMLElement>(
      `.saida[data-setor="${setorId}"]`,
    );
    if (!estrada) return { x: 0, y: 0 };
    const a = el.getBoundingClientRect();
    const b = estrada.getBoundingClientRect();
    return {
      x: b.left + b.width / 2 - (a.left + a.width / 2),
      y: b.top + b.height / 2 - (a.top + a.height / 2),
    };
  }
}

/** Quem saiu e quem chegou neste setor no amanhecer (recortado pela página). */
export interface MovimentosSetor {
  rodada: number;
  sairam: Array<{ id: string; nome: string; para: string; paraNome: string }>;
  chegaram: Array<{ id: string; nome: string; de: string; deNome: string }>;
}

interface AvisoMovimento {
  linhas: Array<{ nome: string; texto: string }>;
  resumo: string;
}

/** Tempos da spec 026 §4 (ms). */
const T_SAIDA = 400;
const T_CHEGADA = 400;
const T_ESCALONA = 60;
const T_AVISO = 4000;
const INCLINA_PX = 6;

function movimentoReduzido(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
