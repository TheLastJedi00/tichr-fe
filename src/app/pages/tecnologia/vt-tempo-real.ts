import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VtBloco } from './vt-bloco';
import { VtNota } from './vt-nota';

/** Uma faixa de tráfego: por onde vai, com o quê, e por quê. */
interface Faixa {
  tipo: string;
  cor: 'read' | 'write' | 'dim';
  caminho: string;
  tec: string;
  porque: string;
}

/**
 * §4 — a vitrine principal.
 *
 * A spec chama a primeira linha de "Leitura (Read)". Isso vale para **três
 * coleções**, não para o sistema: o `onSnapshot` do cliente existe só sobre
 * `qlick_partidas`, `matches/**` e `isolateus_partidas`. Turmas, alunos, planos
 * e perfil são REST — o `turma-api.service.ts` sozinho tem 444 linhas de HTTP.
 *
 * Por isso a linha vira "estado de partida ao vivo" e a tabela ganha uma
 * terceira faixa, que é a que torna as outras duas honestas. E o argumento sai
 * mais forte: a exceção é deliberada e delimitada, não conveniência.
 */
const FAIXAS: Faixa[] = [
  {
    tipo: 'Estado de partida, ao vivo',
    cor: 'read',
    caminho: 'Firebase → Angular',
    tec: 'onSnapshot (WebSocket do SDK)',
    porque:
      'Placar, timer e narração mudam sem parar para a sala inteira. Passar isso pelo NestJS pagaria latência e tráfego por um dado que o Firebase já empurra sozinho. Vale só aqui: qlick_partidas, matches/** e isolateus_partidas.',
  },
  {
    tipo: 'Toda escrita, sem exceção',
    cor: 'write',
    caminho: 'Angular → NestJS → Firebase',
    tec: 'HTTP (REST) + Admin SDK',
    porque:
      'O cliente nunca escreve — as rules dizem allow write: if false nas três coleções. O NestJS é o juiz: valida a legitimidade do voto antes de gravar. É anti-cheat de verdade, não convenção.',
  },
  {
    tipo: 'Todo o resto',
    cor: 'dim',
    caminho: 'Angular → NestJS → Firebase',
    tec: 'HTTP (REST)',
    porque:
      'Turmas, alunos, planos de aula, perfil, backoffice. Não é tempo real, não precisa ser, e passa pela mesma fila de guards da seção anterior.',
  },
];

@Component({
  selector: 'vt-tempo-real',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VtBloco, VtNota],
  template: `
    <vt-bloco
      indice="4"
      eyebrow="o coração"
      titulo="O caminho de ida não é o caminho de volta"
      legenda="A assimetria do primeiro diagrama, agora com nome e endereço. Ler e
        escrever seguem rotas diferentes porque têm inimigos diferentes: a leitura
        briga com latência e custo; a escrita, com trapaça."
    >
      <div class="faixas">
        @for (f of faixas; track f.tipo) {
          <article class="faixa faixa--{{ f.cor }}">
            <p class="tipo">{{ f.tipo }}</p>
            <p class="caminho">{{ f.caminho }}</p>
            <p class="tec">{{ f.tec }}</p>
            <p class="porque">{{ f.porque }}</p>
          </article>
        }
      </div>

      <vt-nota rotulo="por que essas três coleções podem ser públicas">
        Porque são efêmeras e não são sensíveis: máscara da palavra, HP, placar —
        dados que nascem, duram uma aula e morrem. A rule diz isso em prosa, no
        próprio arquivo. Não é que ninguém tenha pensado nelas; é que foram
        escolhidas uma a uma. O que é sensível fica de fora — e a próxima seção é
        sobre exatamente isso.
      </vt-nota>
    </vt-bloco>
  `,
  styles: `
    .faixas {
      display: grid;
      gap: 0.85rem;
      margin-bottom: 1.75rem;
    }
    .faixa {
      padding: 1rem 1.1rem;
      border: 1px solid var(--vt-line);
      border-left-width: 2px;
      border-radius: 8px;
      background: var(--vt-panel);
      backdrop-filter: blur(8px);
    }
    .faixa--read { border-left-color: var(--vt-read); }
    .faixa--write { border-left-color: var(--vt-write); }
    .faixa--dim { border-left-color: var(--vt-line-forte); }

    .tipo {
      margin: 0;
      font-family: var(--vt-mono);
      font-size: 0.85rem;
      color: var(--vt-text);
    }
    .caminho {
      margin: 0.55rem 0 0;
      font-family: var(--vt-mono);
      font-size: 0.78rem;
    }
    .faixa--read .caminho { color: var(--vt-read); }
    .faixa--write .caminho { color: var(--vt-write); }
    .faixa--dim .caminho { color: var(--vt-dim); }

    .tec {
      margin: 0.2rem 0 0;
      font-family: var(--vt-mono);
      font-size: 0.72rem;
      color: var(--vt-dim);
    }
    .porque {
      margin: 0.75rem 0 0;
      max-width: 58ch;
      font-size: 0.85rem;
      line-height: 1.65;
      color: var(--vt-dim);
    }
  `,
})
export class VtTempoReal {
  protected readonly faixas = FAIXAS;
}
