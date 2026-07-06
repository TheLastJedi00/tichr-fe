import { Injectable } from '@angular/core';

export interface TutorialConteudo {
  chave: string;
  titulo: string;
  texto: string;
  /** O "primeiro passo" sugerido ao usuário naquela área. */
  passo: string;
}

const STORAGE_KEY = 'tichr-tutorial-vistos';

/**
 * Tutoriais de primeiro acesso: rastreia (em localStorage) as áreas que o
 * usuário já viu e entrega o conteúdo contextual da rota atual. O disparo
 * visual fica no DashboardLayout (via router), este serviço é só a lógica.
 */
@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly vistos = new Set<string>(this.carregar());

  private readonly conteudos: Record<string, Omit<TutorialConteudo, 'chave'>> = {
    dashboard: {
      titulo: 'Seu painel',
      texto: 'Aqui você tem a saudação do dia e o foco na próxima aula, além dos atalhos para todas as áreas.',
      passo: 'Comece criando uma turma no botão "Nova turma".',
    },
    agenda: {
      titulo: 'Sua agenda',
      texto: 'As aulas são projetadas automaticamente pelas regras de cada turma. Alterne entre a visão Calendário e a Detalhada.',
      passo: 'Toque num dia para ver os detalhes da aula.',
    },
    turmas: {
      titulo: 'Minhas turmas',
      texto: 'Gerencie suas turmas ativas e encerradas. Cada turma tem alunos, equipes e a sua agenda.',
      passo: 'Abra uma turma para gerenciar alunos e pontuação.',
    },
    jogos: {
      titulo: 'Jogos',
      texto: 'O ecossistema de jogos do Tichr para engajar a turma ao vivo — como o Tichr Qlick (quiz) e o Tichr Wor (guerra de castelos), com mais por vir.',
      passo: 'Escolha um jogo para conhecer como ele funciona.',
    },
  };

  /** Conteúdo do tutorial da rota, ou null se não houver ou já foi visto. */
  paraRota(url: string): TutorialConteudo | null {
    const chave = url.split('?')[0].split('/').filter(Boolean)[0] ?? '';
    const c = this.conteudos[chave];
    if (!c || this.vistos.has(chave)) return null;
    return { chave, ...c };
  }

  /** Marca a área como vista (não reaparece). */
  marcarVisto(chave: string): void {
    this.vistos.add(chave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.vistos]));
  }

  private carregar(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}
