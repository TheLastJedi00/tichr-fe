import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VtBloco } from './vt-bloco';
import { VtNota } from './vt-nota';

/**
 * §5 — sessão e o segredo.
 *
 * Duas correções de fundo em relação à spec:
 *
 * 1. **Sem caixa de MFA.** A spec pede o fluxo "do Firebase Auth (… e MFA)". Os
 *    outros três existem; o MFA **não**, e foi deliberadamente cortado (016) —
 *    pode nunca entrar. Desenhar uma caixa "MFA" numa vitrine seria anunciar a
 *    recrutadores uma feature que não existe, na única página do produto em que
 *    uma imprecisão desqualifica o autor.
 * 2. **O Angular não fala Firebase Auth.** A spec diz que sim. O `firebase-app`
 *    inicializa o SDK só para Firestore/Storage; quem tem a Web API key e
 *    conversa com o Identity Toolkit é o backend. Inverter isso apagaria a
 *    decisão mais distintiva da base.
 *
 * O que entra no lugar é mais forte de qualquer jeito: o modelo de sessão real, e
 * o segredo do Isolateus — o exemplo raro de um problema de segurança resolvido
 * por modelagem, não por criptografia.
 */
@Component({
  selector: 'vt-seguranca',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VtBloco, VtNota],
  template: `
    <vt-bloco
      indice="5"
      eyebrow="blindagem"
      titulo="O segredo não é escondido. Ele não está lá."
      legenda="A sessão do professor e a identidade do Alienígena são dois problemas de
        segurança, e nenhum dos dois foi resolvido com criptografia. Foram resolvidos
        decidindo onde o dado mora."
    >
      <h3>a sessão</h3>
      <svg viewBox="0 0 340 118" role="img" aria-labelledby="sec-t">
        <title id="sec-t">
          O Angular envia e-mail e senha ao NestJS, que fala com o Identity
          Toolkit. A resposta traz o ID token no corpo e o refresh token num
          cookie HttpOnly, que o JavaScript não alcança.
        </title>

        <g class="caixa">
          <rect x="6" y="42" width="76" height="40" rx="6" />
          <text x="44" y="60">Angular</text>
          <text x="44" y="73" class="sub">sem SDK de auth</text>
        </g>
        <g class="caixa caixa--write">
          <rect x="132" y="42" width="76" height="40" rx="6" />
          <text x="170" y="60">NestJS</text>
          <text x="170" y="73" class="sub">dono da API key</text>
        </g>
        <g class="caixa">
          <rect x="258" y="42" width="76" height="40" rx="6" />
          <text x="296" y="58">Identity</text>
          <text x="296" y="70">Toolkit</text>
        </g>

        <path class="via via--write" d="M 82 62 L 132 62" />
        <path class="via via--write" d="M 208 62 L 258 62" />
        <text x="107" y="56" class="rot rot--write">senha</text>
        <text x="233" y="56" class="rot rot--dim">REST</text>

        <!-- A volta: dois destinos diferentes, e é esse o ponto. -->
        <path class="via via--read" d="M 150 82 L 150 104 L 44 104 L 44 82" />
        <text x="97" y="114" class="rot rot--read">ID token → localStorage → Bearer</text>

        <!-- Sai pela borda de CIMA (y=42): partindo de baixo, a linha subiria por
             dentro da caixa e cortaria o texto dela. -->
        <path class="via via--seal" d="M 190 42 L 190 24 L 44 24 L 44 42" />
        <text x="117" y="18" class="rot rot--seal">refresh token → cookie HttpOnly</text>
      </svg>

      <p class="obs">
        O refresh token nunca toca o JavaScript. O ID token, sim — e de propósito.
      </p>

      <div class="notas">
        <vt-nota rotulo="por que o cookie só passou a ser possível depois de um domínio">
          Enquanto o backend respondia em tichr-be.vercel.app, o cookie era
          impossível: vercel.app está na Public Suffix List, então o navegador
          tratava front e back como sites distintos. O cookie nasceria
          third-party, exigiria SameSite=None e morreria no Safari — ou seja, em
          todo professor de iPhone. Com o backend em api.tichr.com.br, os dois
          compartilham o domínio registrável e um SameSite=Lax funciona. Sem SSR.
        </vt-nota>
        <vt-nota rotulo="por que o ID token pode ficar no localStorage">
          Porque o prêmio já foi levado pelo cookie. Um XSS com a aba aberta chama
          /auth/refresh e emite um token novo quando quiser — guardar o ID token
          em memória não impediria nada. O que importa é o refresh não ser
          exfiltrável. Saldo: um XSS rouba uma hora de sessão em vez da conta, e o
          guard continua síncrono.
        </vt-nota>
        <vt-nota rotulo="a renovação silenciosa, e o estouro de manada">
          Um 401 dispara /auth/refresh e repete a requisição original. Se dez
          chamadas tomarem 401 juntas, elas não podem disparar dez refreshes: o
          Observable em voo é compartilhado, e as demais esperam o mesmo
          resultado.
        </vt-nota>
      </div>

      <h3 class="h3--seal">o segredo do Isolateus</h3>
      <p class="obs">
        O Isolateus é dedução social: um aluno é o Alienígena e a sala precisa
        descobrir quem. O documento da partida é público — qualquer um pode ler
        com o DevTools. E não adianta.
      </p>

      <!--
        A assinatura da página: um documento cujo conteúdo são as AUSÊNCIAS.
        Mostrar o que não está no JSON diz mais do que qualquer lista de
        tecnologias.
      -->
      <div class="cofre">
        <article class="doc doc--publico">
          <p class="doc__tag">isolateus_partidas/&#123;id&#125; · read: if true</p>
          <pre><code>&#123;
  "status": "DEBATE",
  "setores": [&#123;…&#125;],
  "habitantes": [
    &#123; "nome": "Ana" &#125;,
    &#123; "nome": "Bruno" &#125;
  ]
&#125;</code></pre>
          <ul class="ausencias">
            <li>quem é o Alienígena</li>
            <li>quem é NPC</li>
            <li>a alternativa correta no ar</li>
          </ul>
          <p class="doc__nota">
            Não está censurado no cliente. <strong>Nunca foi escrito aqui.</strong>
          </p>
        </article>

        <article class="doc doc--selado">
          <p class="doc__tag">isolateus_segredos/&#123;id&#125; · deny-all</p>
          <pre><code>&#123;
  "alienigenaId": "…",
  "npcIds": ["…"],
  "corretaIndex": 2
&#125;</code></pre>
          <p class="doc__nota">
            Só o Admin SDK do backend lê. O aluno recebe a fatia dele por REST
            autenticado — e a fatia dele nunca inclui a de ninguém.
          </p>
        </article>
      </div>

      <vt-nota rotulo="por que isto é uma decisão de modelagem, e não de segurança">
        Porque a alternativa óbvia — mandar tudo e esconder na interface — é o que
        quase todo jogo web faz, e é o que o DevTools desmonta em trinta segundos.
        Aqui a pergunta não foi "como escondo?", foi "quem precisa saber?". A
        resposta foi: o servidor. Então o segredo nunca sai de lá.
      </vt-nota>
    </vt-bloco>
  `,
  styles: `
    h3 {
      margin: 0 0 1.25rem;
      font-family: var(--vt-mono);
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--vt-write);
    }
    .h3--seal {
      margin-top: 3.5rem;
      color: var(--vt-seal);
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
      margin-bottom: 1.25rem;
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
      font-size: 10px;
      text-anchor: middle;
    }
    .caixa .sub { fill: var(--vt-dim); font-size: 7px; }

    .via { fill: none; stroke-width: 1.5; }
    .via--write { stroke: var(--vt-write); }
    .via--read,
    .via--seal {
      stroke-width: 1;
      stroke-dasharray: 4 4;
      /* As duas voltas do login andando ao mesmo tempo — é o que elas fazem. */
      animation: fluxo 1.1s linear infinite;
    }
    .via--read { stroke: var(--vt-read); }
    .via--seal { stroke: var(--vt-seal); }
    @keyframes fluxo {
      to { stroke-dashoffset: -8; }
    }
    @media (prefers-reduced-motion: reduce) {
      .via--read,
      .via--seal { animation: none; }
    }
    .rot {
      font-family: var(--vt-mono);
      font-size: 7px;
      text-anchor: middle;
    }
    .rot--write { fill: var(--vt-write); }
    .rot--read { fill: var(--vt-read); }
    .rot--seal { fill: var(--vt-seal); }
    .rot--dim { fill: var(--vt-dim); }

    .obs {
      margin: 0 0 1.75rem;
      max-width: 58ch;
      font-size: 0.9rem;
      line-height: 1.7;
      color: var(--vt-dim);
    }

    .notas { display: grid; gap: 0.85rem; }

    .cofre {
      display: grid;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    .doc {
      padding: 1rem 1.1rem;
      border: 1px solid var(--vt-line);
      border-radius: 8px;
      background: var(--vt-panel);
      backdrop-filter: blur(8px);
    }
    .doc--selado {
      border-style: dashed;
      border-color: color-mix(in srgb, var(--vt-seal) 45%, transparent);
    }
    .doc__tag {
      margin: 0 0 0.85rem;
      font-family: var(--vt-mono);
      font-size: 0.68rem;
      color: var(--vt-read);
    }
    .doc--selado .doc__tag { color: var(--vt-seal); }

    pre { margin: 0; overflow-x: auto; }
    code {
      font-family: var(--vt-mono);
      font-size: 0.72rem;
      line-height: 1.7;
      color: var(--vt-text);
      white-space: pre;
    }
    .doc--selado code { color: var(--vt-dim); }

    /* As ausências: o conteúdo do documento é o que ele NÃO tem. */
    .ausencias {
      list-style: none;
      margin: 0.95rem 0 0;
      padding: 0;
      display: grid;
      gap: 0.3rem;
    }
    .ausencias li {
      position: relative;
      padding-left: 1.35rem;
      font-family: var(--vt-mono);
      font-size: 0.7rem;
      color: var(--vt-seal);
      text-decoration: line-through;
      text-decoration-color: color-mix(in srgb, var(--vt-seal) 60%, transparent);
    }
    .ausencias li::before {
      content: '−';
      position: absolute;
      left: 0.3rem;
      text-decoration: none;
    }

    .doc__nota {
      margin: 0.95rem 0 0;
      font-size: 0.8rem;
      line-height: 1.6;
      color: var(--vt-dim);
    }
    .doc__nota strong { color: var(--vt-text); font-weight: 600; }

    @media (min-width: 720px) {
      .cofre { grid-template-columns: 1fr 1fr; }
    }
  `,
})
export class VtSeguranca {}
