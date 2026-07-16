import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VtBloco } from './vt-bloco';
import { VtNota } from './vt-nota';

/**
 * §3.3 — modelagem NoSQL.
 *
 * A spec fala em "uso estratégico da desnormalização" como se fosse a regra. A
 * regra declarada do projeto é a oposta (`strategy.md`: relacionamentos por
 * referência de IDs), e é o que turmas/alunos/sessões fazem. A desnormalização é
 * **cirúrgica** e mora nos documentos de partida.
 *
 * Contar os dois lados é mais verdadeiro **e** mais interessante: mostra
 * critério — a mesma base usa modelagens opostas de propósito, porque as duas
 * metades têm problemas opostos.
 */
@Component({
  selector: 'vt-dados',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VtBloco, VtNota],
  template: `
    <vt-bloco
      indice="3"
      eyebrow="modelagem"
      titulo="Duas modelagens opostas, na mesma base"
      legenda="O cadastro e a partida têm problemas contrários. Um precisa que o dado
        não se repita; o outro precisa que ele não seja buscado. Aplicar a mesma
        regra aos dois seria mais consistente e pior."
    >
      <div class="par">
        <article>
          <p class="tag">cadastro · referência</p>
          <pre><code>turmas/&#123;id&#125;
  professorId: "uid"    <span class="d">→ aponta</span>
  nome: "3º ano B"

alunos/&#123;id&#125;
  turmaId: "..."        <span class="d">→ aponta</span>
  nome: "Ana"</code></pre>
          <p class="por">
            Muda de vez em quando, e precisa estar certo. O nome da turma vive
            num lugar só: corrigir é um <code>update</code>, não uma varredura.
          </p>
        </article>

        <article>
          <p class="tag tag--read">partida · desnormalização</p>
          <pre><code>qlick_partidas/&#123;id&#125;
  status: "QUESTAO_ATIVA"
  perguntaPublica: &#123;…&#125;   <span class="d">→ cópia</span>
  placar: [&#123;nome, pontos&#125;] <span class="d">→ cópia</span></code></pre>
          <p class="por">
            Muda a cada segundo e é lido por trinta celulares ao mesmo tempo.
            Aqui o nome do aluno vem <em>junto</em> — um documento alimenta a tela
            inteira, sem <em>join</em> e sem custo por aluno conectado.
          </p>
        </article>
      </div>

      <div class="notas">
        <vt-nota rotulo="o Wor faz o contrário do Qlick, e também está certo">
          No Wor o estado é fragmentado: matches/{{ '{' }}id{{ '}' }} guarda o que a sala toda vê,
          e uma subcoleção teams/{{ '{' }}id{{ '}' }} guarda o que é de cada equipe. Cada celular
          escuta só a própria fatia. Onde o Qlick ganha juntando tudo num
          documento, o Wor ganha separando — a diferença é quem precisa ler o quê.
        </vt-nota>
        <vt-nota rotulo="o preço da cópia">
          Desnormalizar troca consistência por velocidade. Cabe porque a partida é
          efêmera: ela nasce, dura uma aula e nunca mais é editada. Um nome errado
          ali morre com a partida — não é um dado que alguém vai corrigir depois.
        </vt-nota>
      </div>
    </vt-bloco>
  `,
  styles: `
    .par {
      display: grid;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    article {
      padding: 1rem 1.1rem;
      border: 1px solid var(--vt-line);
      border-radius: 8px;
      background: var(--vt-panel);
      backdrop-filter: blur(8px);
    }
    .tag {
      margin: 0 0 0.85rem;
      font-family: var(--vt-mono);
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--vt-write);
    }
    .tag--read { color: var(--vt-read); }

    pre {
      margin: 0;
      overflow-x: auto;
    }
    code {
      font-family: var(--vt-mono);
      font-size: 0.72rem;
      line-height: 1.75;
      color: var(--vt-text);
      white-space: pre;
    }
    .d { color: var(--vt-dim); }

    .por {
      margin: 0.95rem 0 0;
      font-size: 0.85rem;
      line-height: 1.65;
      color: var(--vt-dim);
    }
    .por code {
      font-size: 0.78rem;
      color: var(--vt-dim);
    }

    .notas { display: grid; gap: 0.85rem; }

    @media (min-width: 720px) {
      .par { grid-template-columns: 1fr 1fr; }
    }
  `,
})
export class VtDados {}
