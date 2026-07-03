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
 * Links do painel do professor. Plano de Aula exige Graduado — para o
 * Estagiário o item vira cadeado e aponta para o upsell (`/planos`).
 */
export function linksPainel(plano: PlanoAtual | undefined): NavLink[] {
  const podePlano = planoAtendeMinimo(plano, 'GRADUADO');
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
    { label: 'Configurações', path: '/configuracoes', icon: 'settings' },
  ];
}
