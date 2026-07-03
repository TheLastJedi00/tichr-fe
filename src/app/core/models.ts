export type TipoModalidade = 'GRADE_FIXA' | 'MODULO_FECHADO';
export type StatusSessao = 'AGENDADA' | 'CANCELADA' | 'REALIZADA';
export type EscopoExcecao = 'GLOBAL' | 'ESCOLA' | 'PESSOAL';
export type PlanoAtual = 'ESTAGIARIO' | 'GRADUADO' | 'MESTRE' | 'PHD';

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
  horaInicio?: string;
  horaFim?: string;
  encerradaManualmente?: boolean;
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
  horaInicio?: string;
  horaFim?: string;
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
  planoAtual?: PlanoAtual;
  slotsAdicionaisComprados?: number;
}

export interface UpdateProfilePayload {
  nomeExibicao?: string;
  disciplina?: string;
  bio?: string;
  disciplinas?: string[];
}

export interface Aluno {
  id: string;
  turmaId: string;
  nome: string;
  tagsPerfil?: string[];
  pinAcesso?: string;
  xpTotal?: number;
}

export interface RankingItem {
  posicao: number;
  alunoId: string;
  nome: string;
  xpTotal: number;
}

export interface LoginInfoTurma {
  turmaId: string;
  turmaNome: string;
  alunos: Array<{ id: string; nome: string }>;
}

export interface LoginAlunoResponse {
  token: string;
  aluno: { id: string; nome: string; turmaId: string; xpTotal: number };
}

export interface MembroSquad {
  alunoId: string;
  nome: string;
  papel?: string;
}

export interface Squad {
  numero: number;
  tema?: string;
  membros: MembroSquad[];
}

export interface CriarAgrupamentoPayload {
  numeroEquipes: number;
  papeis?: string[];
  temas?: string[];
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
