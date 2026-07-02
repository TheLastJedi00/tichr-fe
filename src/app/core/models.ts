export type TipoModalidade = 'GRADE_FIXA' | 'MODULO_FECHADO';
export type StatusSessao = 'AGENDADA' | 'CANCELADA' | 'REALIZADA';
export type EscopoExcecao = 'GLOBAL' | 'ESCOLA' | 'PESSOAL';

export interface Sessao {
  id: string;
  turmaId: string;
  professorId: string;
  numero: number;
  data: string;
  status: StatusSessao;
}

export interface Turma {
  id: string;
  professorId: string;
  nome: string;
  tipoModalidade: TipoModalidade;
  diasSemana: number[];
  dataInicio: string;
  totalAulas?: number;
  dataFimPrevista?: string;
  cor?: string;
  disciplina?: string;
  ativo: boolean;
}

export interface CriarTurmaPayload {
  nome: string;
  tipoModalidade: TipoModalidade;
  diasSemana: number[];
  dataInicio: string;
  totalAulas?: number;
  cor?: string;
  disciplina?: string;
}

export interface CriarExcecaoPayload {
  data: string;
  motivo: string;
  escopo: EscopoExcecao;
}

export interface Profile {
  uid: string;
  nomeExibicao?: string;
  disciplina?: string;
  bio?: string;
  disciplinas?: string[];
}

export interface UpdateProfilePayload {
  nomeExibicao?: string;
  disciplina?: string;
  bio?: string;
  disciplinas?: string[];
}

export interface Ferias {
  id: string;
  professorId: string;
  turmaId?: string;
  dataInicio: string;
  dataFim: string;
  descricao?: string;
}

export interface CriarFeriasPayload {
  turmaId?: string;
  dataInicio: string;
  dataFim: string;
  descricao?: string;
}
