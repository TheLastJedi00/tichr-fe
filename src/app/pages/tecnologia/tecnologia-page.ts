import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../ui/reveal.directive';
import { VtArquitetura } from './vt-arquitetura';
import { VtBackend } from './vt-backend';
import { VtDados } from './vt-dados';
import { VtSeguranca } from './vt-seguranca';
import { VtTempoReal } from './vt-tempo-real';

/**
 * Vitrine Tecnológica — página pública de portfólio (spec 018).
 *
 * É a única página do Tichr cujo público não é professor: ela existe para um
 * recrutador ou Tech Lead entender a engenharia sem clonar o repositório. Por
 * isso sai do design system (precedente: a `landing-page`, que já fixa cores
 * fora dos tokens) e é **escura sempre**, sem reagir ao `data-theme`.
 *
 * Os tokens `--vt-*` moram no `:host` daqui e **herdam** para os blocos filhos —
 * custom properties descem pela árvore, então não há import de estilo entre
 * componentes. O prefixo declara que eles não são do DS e não migram para o
 * `styles.scss`.
 *
 * As três cores são uma legenda, não decoração:
 *   verde = leitura direta · azul = escrita pelo juiz · laranja = selado.
 * O leitor as aprende no topo e lê todos os diagramas com elas.
 */
@Component({
  selector: 'app-tecnologia-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RevealDirective,
    VtArquitetura,
    VtBackend,
    VtDados,
    VtTempoReal,
    VtSeguranca,
  ],
  template: `
    <a class="voltar" routerLink="/">← Voltar</a>

    <header class="hero">
      <p class="eyebrow">Tichr · engenharia</p>
      <h1>
        Um SaaS de sala de aula<br />
        com <span class="hl-write">um juiz</span> no meio do caminho.
      </h1>
      <p class="lede">
        O Tichr roda jogos multijogador em tempo real numa sala com trinta
        celulares. Isso impõe três problemas ao mesmo tempo — concorrência,
        custo e trapaça — e a arquitetura inteira é a resposta a eles. Esta
        página mostra como, com o código aberto embaixo de cada afirmação.
      </p>

      <!--
        A legenda não é um enfeite no topo: é a chave de leitura da página
        inteira. As três cores significam a mesma coisa em todos os diagramas.
      -->
      <dl class="legenda">
        <div>
          <dt class="hl-read">leitura</dt>
          <dd>direto do Firebase, sem passar pelo backend</dd>
        </div>
        <div>
          <dt class="hl-write">escrita</dt>
          <dd>sempre pelo NestJS, que julga antes de gravar</dd>
        </div>
        <div>
          <dt class="hl-seal">selado</dt>
          <dd>o cliente nunca lê, nem com o DevTools aberto</dd>
        </div>
      </dl>
    </header>

    <vt-arquitetura appReveal />
    <vt-backend appReveal />
    <vt-dados appReveal />
    <vt-tempo-real appReveal />
    <vt-seguranca appReveal />

    <footer class="rodape">
      <p>
        Tichr · <a href="https://github.com/TheLastJedi00" target="_blank" rel="noopener">github.com/TheLastJedi00</a>
      </p>
    </footer>
  `,
  styles: `
    :host {
      /* Fundo grafite, não preto puro: mantém o parentesco Slate do Tichr. */
      --vt-void: #0a0d14;
      --vt-panel: rgba(255, 255, 255, 0.035);
      --vt-panel-forte: rgba(255, 255, 255, 0.06);
      --vt-line: rgba(148, 163, 184, 0.18);
      --vt-line-forte: rgba(148, 163, 184, 0.38);
      --vt-text: #e6edf7;
      --vt-dim: #8b97a8;

      /* A legenda (ver docblock). O azul é o próprio blue-400 do Tichr. */
      --vt-read: #4ade80;
      --vt-write: #60a5fa;
      --vt-seal: #fb923c;

      /*
       * Display = monoespaçada; corpo = Inter (já carregada pelo app). Inverte o
       * padrão de portfólio (grotesk display + mono de enfeite): o assunto aqui
       * é código, então a voz da página é a do assunto. Stack de sistema —
       * nenhuma webfont nova numa página cujo argumento é engenharia.
       */
      --vt-mono: ui-monospace, 'JetBrains Mono', 'SF Mono', 'Cascadia Code', Menlo,
        Consolas, monospace;

      display: block;
      min-height: 100dvh;
      padding: 1.25rem 1rem 4rem;
      background: var(--vt-void);
      color: var(--vt-text);
      /* Trava o tema: a página não acompanha o data-theme do app. */
      color-scheme: dark;
    }

    .voltar {
      display: inline-block;
      margin-bottom: 2.5rem;
      font-family: var(--vt-mono);
      font-size: 0.8rem;
      color: var(--vt-dim);
    }
    .voltar:hover { color: var(--vt-text); }

    .hero {
      max-width: 68ch;
      margin: 0 auto;
    }

    .eyebrow {
      margin: 0 0 1.25rem;
      font-family: var(--vt-mono);
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--vt-dim);
    }

    h1 {
      margin: 0 0 1.5rem;
      font-family: var(--vt-mono);
      font-size: clamp(1.6rem, 5.2vw, 2.6rem);
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }
    .hl-write { color: var(--vt-write); }

    .lede {
      margin: 0;
      max-width: 60ch;
      font-size: 1rem;
      line-height: 1.7;
      color: var(--vt-dim);
    }

    .hl-read { color: var(--vt-read); }
    .hl-seal { color: var(--vt-seal); }

    .legenda {
      display: grid;
      gap: 0.5rem;
      margin: 2.5rem 0 0;
      padding: 1rem 1.1rem;
      border: 1px solid var(--vt-line);
      border-radius: 8px;
      background: var(--vt-panel);
      backdrop-filter: blur(8px);
    }
    .legenda > div {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }
    .legenda dt {
      flex: 0 0 4.5rem;
      font-family: var(--vt-mono);
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .legenda dd {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--vt-dim);
    }

    .rodape {
      max-width: 68ch;
      margin: 5rem auto 0;
      padding-top: 1.5rem;
      border-top: 1px solid var(--vt-line);
      font-family: var(--vt-mono);
      font-size: 0.78rem;
      color: var(--vt-dim);
    }
    .rodape a { color: var(--vt-dim); text-decoration: underline; }
    .rodape a:hover { color: var(--vt-text); }

    @media (min-width: 900px) {
      :host { padding: 2rem 2rem 6rem; }
    }
  `,
})
export class TecnologiaPage {}
