import { IconName } from '../ui/icon/icon';
import { PlanoAtual } from './models';
import { planoAtendeMinimo } from './plano.util';

/** Item de navegação do painel (menu lateral e rodapé compartilham). */
export interface NavLink {
  label: string;
  path: string;
  icon: IconName;
  locked?: boolean;
  query?: Record<string, string>;
}

/**
 * Links do painel do professor. O **cadeado é sistêmico** (BUG-007): qualquer
 * item de recurso fora do plano vigente recebe `locked` — nunca `disabled`, para
 * o clique ainda levar ao upsell.
 * - **Plano de Aula** exige **Graduado** (Estagiário → cadeado + `/planos`).
 * - **Jogos** (Qlick/Wor/Isolateus) é **exclusivo do PhD** → cadeado para quem
 *   não é PhD; o clique segue para `/jogos` (a vitrine já faz o upsell por jogo).
 */
export function linksPainel(plano: PlanoAtual | undefined): NavLink[] {
  const podePlano = planoAtendeMinimo(plano, 'GRADUADO');
  const podeJogos = planoAtendeMinimo(plano, 'PHD');
  return [
    { label: 'Dashboard', path: '/dashboard', icon: 'home' },
    { label: 'Minha Agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Minhas Turmas', path: '/turmas', icon: 'building' },
    podePlano
      ? { label: 'Plano de Aula', path: '/plano-aula', icon: 'book' }
      : {
          label: 'Plano de Aula',
          path: '/planos',
          icon: 'book',
          locked: true,
          query: { recurso: 'PLANO_AULA' },
        },
    { label: 'Jogos', path: '/jogos', icon: 'game', locked: !podeJogos },
    { label: 'Configurações', path: '/configuracoes', icon: 'settings' },
  ];
}
