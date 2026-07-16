import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VtBloco } from './vt-bloco';
import { VtNota } from './vt-nota';

/** Um degrau do caminho da requisição. */
interface Etapa {
  nome: string;
  papel: string;
  nota?: string;
}

const ETAPAS: Etapa[] = [
  {
    nome: 'ValidationPipe',
    papel: 'o corpo tem exatamente a forma do DTO — nem um campo a mais',
    nota: 'Roda com forbidNonWhitelisted: campo desconhecido não é ignorado, é 400. Um cliente que tente injetar um professorId no corpo de um POST leva a porta na cara antes de chegar ao service.',
  },
  {
    nome: 'AuthGuard',
    papel: 'decodifica o token e resolve quem está falando',
    nota: 'Registrado como APP_GUARD global. A consequência é o inverso do default inseguro: toda rota nova nasce protegida, e @Public() é o opt-out explícito. Esquecer um decorator fecha a rota — não abre.',
  },
  {
    nome: 'AdminGuard',
    papel: 'só nas rotas /admin: relê professores/{uid}.isAdmin no Firestore',
    nota: 'De propósito não é custom claim nem lista de e-mails em env. Claim exigiria re-login para valer; env exigiria redeploy. Lendo o documento a cada chamada, promover e revogar valem na hora.',
  },
  {
    nome: 'Controller',
    papel: 'recebe e devolve HTTP. Não decide nada',
  },
  {
    nome: 'Service',
    papel: 'a regra de negócio, o anti-cheat, e quem orquestra o resto',
  },
  {
    nome: 'Repository',
    papel: 'a única camada que fala Firestore — e devolve entidade, nunca JSON cru',
    nota: 'Regra de ouro do repositório: o retorno passa por plainToInstance. O service recebe uma classe com métodos, não um objeto literal — a regra de negócio mora na entidade e viaja com ela.',
  },
];

/**
 * §3.2 — o ciclo de vida da requisição.
 *
 * Aqui a numeração é honesta: isto **é** uma sequência, e a ordem carrega
 * informação (o guard rodar depois do roteamento e antes do handler é o ponto).
 *
 * A spec desenha `Auth Guards → Controllers`. No Nest o guard roda **depois** do
 * roteamento e **antes** do handler — a caixa fica entre os dois. Corrigido.
 */
@Component({
  selector: 'vt-backend',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VtBloco, VtNota],
  template: `
    <vt-bloco
      indice="2"
      eyebrow="o caminho da escrita"
      titulo="O que acontece entre o toque e o banco"
      legenda="Toda escrita do Tichr atravessa esta fila, na ordem. Nenhuma etapa é
        opcional, e duas delas são o motivo de o cliente não conseguir mentir."
    >
      <ol class="fila">
        @for (e of etapas; track e.nome; let i = $index; let ultimo = $last) {
          <li>
            <div class="degrau">
              <span class="num">{{ i + 1 }}</span>
              <div class="txt">
                <p class="nome">{{ e.nome }}</p>
                <p class="papel">{{ e.papel }}</p>
                @if (e.nota) {
                  <vt-nota rotulo="detalhe">{{ e.nota }}</vt-nota>
                }
              </div>
            </div>
            @if (!ultimo) {
              <span class="tubo" aria-hidden="true"></span>
            }
          </li>
        }
      </ol>

      <p class="fecho">
        No fim da fila está o Firestore. A resposta volta pelo mesmo caminho — e
        se o Service disser que a ação é ilegítima, ela nunca chega lá.
      </p>
    </vt-bloco>
  `,
  styles: `
    .fila {
      list-style: none;
      margin: 0 0 1.75rem;
      padding: 0;
    }
    .degrau {
      display: flex;
      gap: 0.9rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--vt-line);
      border-radius: 8px;
      background: var(--vt-panel);
      backdrop-filter: blur(8px);
    }
    .num {
      flex: 0 0 auto;
      width: 1.4rem;
      height: 1.4rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--vt-write);
      border-radius: 4px;
      color: var(--vt-write);
      font-family: var(--vt-mono);
      font-size: 0.7rem;
    }
    .txt { min-width: 0; }
    .nome {
      margin: 0;
      font-family: var(--vt-mono);
      font-size: 0.88rem;
      color: var(--vt-text);
    }
    .papel {
      margin: 0.3rem 0 0;
      font-size: 0.85rem;
      line-height: 1.6;
      color: var(--vt-dim);
    }
    .papel + vt-nota { margin-top: 0.7rem; display: block; }

    /* A linha conectiva de 1px que a spec pede — aqui ela é o próprio fluxo. */
    .tubo {
      display: block;
      width: 1px;
      height: 1.15rem;
      margin-left: 1.7rem;
      background: linear-gradient(var(--vt-write), var(--vt-line-forte));
    }

    .fecho {
      margin: 0;
      max-width: 58ch;
      font-size: 0.9rem;
      line-height: 1.7;
      color: var(--vt-dim);
    }
  `,
})
export class VtBackend {
  protected readonly etapas = ETAPAS;
}
