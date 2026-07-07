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
  // Configuração de pontuação/gamificação (defaults aplicados no backend).
  pontuacaoAtiva?: boolean;
  nomePontuacao?: string;
  rankingAtivo?: boolean;
  rotuloAdicionar?: string;
  rotuloRemover?: string;
  /** PIN da turma (portal do aluno): 2 díg (Smart PIN) ou 6 díg (legado). */
  pinTurma?: string;
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
  pontuacaoAtiva?: boolean;
  nomePontuacao?: string;
  rankingAtivo?: boolean;
  rotuloAdicionar?: string;
  rotuloRemover?: string;
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
  username?: string;
  avatarUrl?: string;
  planoAtual?: PlanoAtual;
  slotsAdicionaisComprados?: number;
  /** Trava de identificador: false = @username bloqueado no cooldown. */
  podeAlterarUsername?: boolean;
  /** Dias que faltam para liberar a próxima troca do @username (0 = liberado). */
  diasParaTrocarUsername?: number;
  /** Acesso ao backoffice (backoffice/painel admin). */
  isAdmin?: boolean;
}

// --- Backoffice (Painel Administrativo) ---

export interface AdminMetrics {
  totalProfessores: number;
  ativos: number;
  desativados: number;
  porPlano: Record<PlanoAtual, number>;
}

export interface UsoProfessor {
  turmasAtivas: number;
  alunos: number;
  qlicks: number;
}

export interface UsuarioAdmin {
  uid: string;
  email?: string;
  nomeExibicao?: string;
  username?: string;
  planoAtual: PlanoAtual;
  desativadoEm?: string;
  uso: UsoProfessor;
}

export type TipoCupom = 'PLANO_GRATIS' | 'MESES_GRATIS';

export interface Cupom {
  id: string;
  codigo: string;
  tipo: TipoCupom;
  planoConcedido?: PlanoAtual;
  meses?: number;
  ativo: boolean;
  usos: number;
  maxUsos?: number;
}

export interface CriarCupomPayload {
  codigo: string;
  tipo: TipoCupom;
  planoConcedido?: PlanoAtual;
  meses?: number;
  maxUsos?: number;
  ativo?: boolean;
}

export interface UpdateProfilePayload {
  nomeExibicao?: string;
  disciplina?: string;
  bio?: string;
  disciplinas?: string[];
  username?: string;
  avatarUrl?: string;
}

export interface CheckUsernameResponse {
  username: string;
  disponivel: boolean;
}

export interface PortalTurma {
  turmaId: string;
  nome: string;
  cor?: string;
  /** Nº de dígitos do PIN da turma (2 = Smart PIN, 6 = legado) — slots do portal. */
  pinLength?: number;
}

/** Professor exibido no card de resultado da busca do portal do aluno. */
export interface PortalProfessor {
  nome: string;
  username: string;
  avatarUrl?: string;
}

/** Resposta da busca pública (`GET /portal/professor/:username/turmas`). */
export interface PortalBuscaResponse {
  professor: PortalProfessor;
  turmas: PortalTurma[];
}

/** Payload agregado do painel do professor (`GET /home`). */
export interface HomePayload {
  profile: Profile;
  turmas: Turma[];
}

/** Hall da Fama: turmas encerradas de um professor (`GET .../hall`). */
export interface HallResponse {
  professor: PortalProfessor;
  turmas: PortalTurma[];
}

/** Mural público de uma turma encerrada (`GET /portal/turma/:id/hall`). */
export interface HallTurma {
  turmaId: string;
  turmaNome: string;
  nomePontuacao: string;
  alunos: Array<{ id: string; nome: string }>;
  ranking: Array<{ posicao: number; alunoId: string; nome: string; xpTotal: number }>;
}

export interface PlanoAula {
  id: string;
  professorId: string;
  disciplina: string;
  contextoGeral: string;
}

export interface Topico {
  id: string;
  professorId: string;
  disciplina: string;
  nome: string;
}

export interface Alocacao {
  id: string;
  turmaId: string;
  numeroAula: number;
  topicoId: string;
}

export interface TopicoAula {
  numeroAula: number;
  topico: string;
}

export interface PerguntaQlick {
  enunciado: string;
  alternativas: string[];
  corretaIndex: number;
}

export interface Qlick {
  id: string;
  professorId: string;
  titulo: string;
  disciplina?: string;
  topicoId?: string;
  turmaId?: string;
  /** Turmas atribuídas ao Qlick (N:N). */
  turmaIds?: string[];
  duracaoSegundos: number;
  perguntas: PerguntaQlick[];
}

export interface CriarQlickPayload {
  titulo: string;
  disciplina?: string;
  topicoId?: string;
  turmaId?: string;
  turmaIds?: string[];
  duracaoSegundos?: number;
  perguntas: PerguntaQlick[];
}

export type StatusPartida =
  | 'LOBBY'
  | 'QUESTAO_ATIVA'
  | 'RANKING_PARCIAL'
  | 'ENCERRADO';

export interface PlacarItem {
  alunoId: string;
  nome: string;
  pontos: number;
}

/** Estado em tempo real de uma partida (lido do Firestore via onSnapshot). */
export interface Partida {
  id: string;
  qlickId: string;
  professorId: string;
  turmaId?: string;
  titulo: string;
  status: StatusPartida;
  perguntaAtual: number;
  totalPerguntas: number;
  duracaoSegundos: number;
  perguntaIniciadaEm?: string | null;
  perguntaPublica?: { enunciado: string; alternativas: string[] } | null;
  corretaIndex?: number | null;
  inscritos: { alunoId: string; nome: string }[];
  placar: PlacarItem[];
  rankingParcial?: PlacarItem[];
  rankingFinal?: Array<{ posicao: number } & PlacarItem>;
}

export interface QlickDoDia {
  partidaId: string;
  titulo: string;
  status: StatusPartida;
}

export interface ProgressoTurma {
  concluidas: number;
  total: number;
  pct: number;
  /** Base coletiva que o andamento rendeu a cada aluno. */
  pontuacaoBase: number;
}

export interface Aluno {
  id: string;
  turmaId: string;
  nome: string;
  tagsPerfil?: string[];
  pinAcesso?: string;
  xpTotal?: number;
  /** Equipe persistente do aluno; null/ausente = sem equipe (pool). */
  equipeId?: string | null;
  /** Cargos atribuídos ao aluno (relação N↔N com Cargo). */
  cargoIds?: string[];
}

export interface Cargo {
  id: string;
  turmaId: string;
  nome: string;
}

export interface Equipe {
  id: string;
  turmaId: string;
  titulo: string;
  descricao?: string;
  cor: string;
  criadoEm: string;
}

export interface CriarEquipePayload {
  titulo: string;
  descricao?: string;
  cor: string;
}

export interface AtualizarEquipePayload {
  titulo?: string;
  descricao?: string;
  cor?: string;
}

export interface RankingItem {
  posicao: number;
  alunoId: string;
  nome: string;
  xpTotal: number;
}

export interface TurmaConfigPublica {
  nomePontuacao: string;
  rankingAtivo: boolean;
}

export interface LoginInfoTurma {
  turmaId: string;
  turmaNome: string;
  alunos: Array<{ id: string; nome: string }>;
  config: TurmaConfigPublica;
  /** Nº de dígitos do PIN do aluno (2 = Smart PIN, 4 = legado). */
  pinAlunoLength?: number;
}

export interface LoginAlunoResponse {
  token: string;
  aluno: { id: string; nome: string; turmaId: string; xpTotal: number };
  turma: TurmaConfigPublica;
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

// --- Tichr Wor ---

export interface PalavraWor {
  id?: string;
  palavra: string;
  dicas: string[];
}

export interface WorJogo {
  id: string;
  professorId: string;
  nome: string;
  disciplina?: string;
  /** Tópico do plano de aula (opcional) — referência ao `Topico` (mesmo do Qlick). */
  topicoId?: string;
  /** Turma única (legado). Substituída por `turmaIds` (N:N). */
  turmaId?: string;
  /** Turmas atribuídas à batalha (relação N:N). */
  turmaIds?: string[];
  palavras: PalavraWor[];
}

export interface CriarWorJogoPayload {
  nome: string;
  disciplina?: string;
  topicoId?: string;
  turmaIds?: string[];
  palavras: { palavra: string; dicas: string[] }[];
}

export type StatusMatch = 'LOBBY' | 'EM_ANDAMENTO' | 'ENCERRADO';

export interface WorTeam {
  id: string;
  matchId: string;
  nome: string;
  cor: string;
  hp: number;
  isHorde: boolean;
  membros: { alunoId: string; nome: string }[];
}

export interface WorMatch {
  id: string;
  jogoId: string;
  professorId: string;
  turmaId: string;
  nome: string;
  status: StatusMatch;
  ondaIndex: number;
  totalOndas: number;
  /** Máscara da palavra: letra revelada, '_' (oculta) ou ' ' (espaço). */
  mascara: string[];
  letrasTentadas: string[];
  cartasVisiveis: string[];
  totalCartas: number;
  turnoEquipeId?: string | null;
  ordemEquipes: string[];
  /** Ações já feitas pelos membros da equipe do turno nesta rodada. */
  acoesRodada: AcaoMembroWor[];
  /** Início do turno/rodada atual (ISO) — base do cronômetro de 1 min. */
  rodadaIniciadaEm?: string | null;
  /** Snapshot de todas as equipes (o aluno vê os castelos rivais pela raiz). */
  placar: PlacarEquipe[];
  /** Resultado da última rodada (reveal + quem atacou). */
  resumoRodada?: ResumoRodada | null;
  inscritos: { alunoId: string; nome: string }[];
  vencedorEquipeId?: string | null;
}

/** Ação de um membro na rodada (para o cliente saber quem já jogou). */
export interface AcaoMembroWor {
  alunoId: string;
  tipo: 'LETRA' | 'ARRISCAR';
  letra?: string;
  acertou: boolean;
  ordem: number;
}

/** Snapshot público de uma equipe (castelo) na raiz da partida. */
export interface PlacarEquipe {
  id: string;
  nome: string;
  cor: string;
  hp: number;
  isHorde: boolean;
}

/** Resultado da última rodada resolvida — reveal + quem atacou quem. */
export interface ResumoRodada {
  seq: number;
  equipeId: string;
  equipeNome: string;
  acertadores: { nome: string; letra: string }[];
  acao: 'ATACAR' | 'DICA' | 'NADA';
  alvoEquipeId?: string;
  alvoNome?: string;
  dano?: number;
  critico?: boolean;
  porTempo?: boolean;
}

export interface WorMatchView {
  match: WorMatch;
  teams: WorTeam[];
}
