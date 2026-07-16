import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VtBloco } from './vt-bloco';
import { VtNota } from './vt-nota';

/**
 * §3.1 — a tríade, e a assimetria que o resto da página explora.
 *
 * O diagrama já diz a tese: a linha Angular→NestJS é sólida (todo o resto do
 * sistema), e a Angular←Firebase é tracejada e fina (a exceção deliberada, só
 * para partida ao vivo). Desenhar as duas iguais seria a imprecisão que apaga a
 * decisão mais distintiva do código.
 */
@Component({
  selector: 'vt-arquitetura',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VtBloco, VtNota],
  template: `
    <vt-bloco
      indice="1"
      eyebrow="visão global"
      titulo="Três peças, e uma seta que não fecha o triângulo"
      legenda="Angular, NestJS e Firebase. O que distingue o Tichr não são as peças — é
        que o cliente fala com o banco em um sentido só, e apenas para o estado de
        uma partida em andamento. Todo o resto passa pelo backend."
    >
      <!-- viewBox colado no conteúdo (y 8→138): sobra vira buraco na página. -->
      <svg viewBox="0 0 340 142" role="img" aria-labelledby="arq-t">
        <title id="arq-t">
          Angular envia escritas ao NestJS, que grava no Firebase. O Firebase
          devolve o estado da partida direto ao Angular, sem passar pelo NestJS.
        </title>

        <!-- Angular -->
        <g class="caixa">
          <rect x="8" y="76" width="88" height="48" rx="6" />
          <text x="52" y="96">Angular</text>
          <text x="52" y="110" class="sub">signals</text>
        </g>

        <!-- NestJS: o juiz. Fica no alto, no caminho da escrita. -->
        <g class="caixa caixa--write">
          <rect x="126" y="12" width="88" height="48" rx="6" />
          <text x="170" y="32">NestJS</text>
          <text x="170" y="46" class="sub">o juiz</text>
        </g>

        <!-- Firebase -->
        <g class="caixa">
          <rect x="244" y="76" width="88" height="48" rx="6" />
          <text x="288" y="96">Firebase</text>
          <text x="288" y="110" class="sub">Firestore</text>
        </g>

        <!-- Escrita: Angular -> NestJS -> Firebase (sólida, passa pelo juiz).
             Rótulos ancorados para FORA da diagonal — centrados, encavalam. -->
        <path class="via via--write" d="M 96 88 L 126 46" />
        <path class="via via--write" d="M 214 46 L 244 88" />
        <text x="102" y="62" class="rot rot--write rot--fim">escreve</text>
        <text x="238" y="62" class="rot rot--write rot--ini">valida</text>

        <!-- Leitura: Firebase -> Angular (tracejada e fina: a exceção) -->
        <path class="via via--read" d="M 244 112 L 100 112" />
        <path class="via via--read seta" d="M 108 108 L 100 112 L 108 116" />
        <text x="172" y="132" class="rot rot--read">estado da partida, ao vivo</text>
      </svg>

      <div class="notas">
        <vt-nota rotulo="por que o cliente não escreve nunca">
          Trinta alunos votando ao mesmo tempo é um problema de concorrência e de
          confiança. Se o celular gravasse a pontuação, bastaria o DevTools para
          o aluno se dar mil pontos. O NestJS decide se a ação é legítima antes
          de qualquer gravação — o cliente pede, não manda.
        </vt-nota>
        <vt-nota rotulo="por que a leitura fura o backend">
          Placar, timer e narração mudam várias vezes por segundo para a sala
          inteira. Passar isso por HTTP no NestJS seria pagar duas vezes — em
          latência e em tráfego — por um dado que o Firebase já sabe entregar por
          WebSocket. A exceção vale só onde o dado é efêmero e não é sensível.
        </vt-nota>
      </div>
    </vt-bloco>
  `,
  styles: `
    svg {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      margin-bottom: 1.75rem;
    }
    .caixa rect {
      fill: var(--vt-panel-forte);
      stroke: var(--vt-line-forte);
      stroke-width: 1;
    }
    .caixa--write rect { stroke: var(--vt-write); }
    .caixa text {
      fill: var(--vt-text);
      font-family: var(--vt-mono);
      font-size: 11px;
      text-anchor: middle;
    }
    .caixa .sub {
      fill: var(--vt-dim);
      font-size: 8px;
    }
    .via { fill: none; stroke-width: 1.5; }
    .via--write { stroke: var(--vt-write); }
    .via--read {
      stroke: var(--vt-read);
      stroke-width: 1;
      stroke-dasharray: 4 4;
      /*
       * O tracejado anda: é o único lugar da página onde o dado está literalmente
       * fluindo sem ninguém pedir, então é o único que se mexe sozinho.
       */
      animation: fluxo 1.1s linear infinite;
    }
    @keyframes fluxo {
      to { stroke-dashoffset: -8; }
    }
    /* Loop infinito é gatilho vestibular — a página que se vende como bem-feita
       é a última que pode escorregar nisso. */
    @media (prefers-reduced-motion: reduce) {
      .via--read { animation: none; }
    }
    .rot {
      font-family: var(--vt-mono);
      font-size: 7.5px;
      text-anchor: middle;
    }
    .rot--fim { text-anchor: end; }
    .rot--ini { text-anchor: start; }
    .rot--write { fill: var(--vt-write); }
    .rot--read { fill: var(--vt-read); }
    .seta { stroke-dasharray: none; }

    .notas { display: grid; gap: 0.85rem; }
  `,
})
export class VtArquitetura {}
