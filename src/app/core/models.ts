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
  ativo: boolean;
}

export interface CriarTurmaPayload {
  nome: string;
  tipoModalidade: TipoModalidade;
  diasSemana: number[];
  dataInicio: string;
  totalAulas?: number;
}

export interface CriarExcecaoPayload {
  data: string;
  motivo: string;
  escopo: EscopoExcecao;
}
