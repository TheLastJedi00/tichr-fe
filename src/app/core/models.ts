import { LimiaresNivel } from './nivel.util';

export type TipoModalidade = 'GRADE_FIXA' | 'MODULO_FECHADO';
export type StatusSessao = 'AGENDADA' | 'CANCELADA' | 'REALIZADA';
export type EscopoExcecao = 'GLOBAL' | 'ESCOLA' | 'PESSOAL';
export type PlanoAtual = 'ESTAGIARIO' | 'GRADUADO' | 'MESTRE' | 'PHD';

/** Situação da assinatura paga (espelha o backend). */
export type StatusAssinatura = 'ATIVA' | 'PENDENTE' | 'INADIMPLENTE' | 'CANCELADA';

/** Meio de pagamento no checkout. */
export type MetodoPagamento = 'PIX' | 'CARTAO';

/** Status de uma cobrança no gateway. */
export type StatusCobranca =
  | 'PENDING'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PAID'
  | 'REFUNDED';

/**
 * Resposta do início de um checkout. `concedido` = aplicado na hora (admin ou
 * destino gratuito). Caso contrário, traz os dados de pagamento: PIX inline
 * (`brCode`/`brCodeBase64`) ou URL do checkout de cartão (`url`).
 */
export interface IniciarCheckout {
  concedido?: boolean;
  billingId?: string;
  metodo?: MetodoPagamento;
  status?: StatusCobranca;
  valorCentavos?: number;
  brCode?: string;
  brCodeBase64?: string;
  expiraEm?: string;
  url?: string;
}

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
  // Limiares de nível (XP para alcançar cada tier). Bronze = piso 0.
  nivelPrata?: number;
  nivelOuro?: number;
  nivelDiamante?: number;
  nivelPlatina?: number;
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
  nivelPrata?: number;
  nivelOuro?: number;
  nivelDiamante?: number;
  nivelPlatina?: number;
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
  /** Plano efetivo (para os gates): cai para ESTAGIARIO se a assinatura vence. */
  planoAtual?: PlanoAtual;
  /** Plano contratado (o que o professor paga) — para a tela de plano e o CTA de renovar. */
  planoContratado?: PlanoAtual;
  /** Situação da assinatura (ATIVA enquanto em dia; INADIMPLENTE se venceu). */
  statusAssinatura?: StatusAssinatura;
  /** Vencimento da assinatura paga (ISO), se houver. */
  assinaturaAte?: string;
  /** Plano pago escolhido no cadastro e ainda não pago (leva ao checkout). */
  planoPretendido?: PlanoAtual;
  slotsAdicionaisComprados?: number;
  /** Trava de identificador: false = @username bloqueado no cooldown. */
  podeAlterarUsername?: boolean;
  /** Dias que faltam para liberar a próxima troca do @username (0 = liberado). */
  diasParaTrocarUsername?: number;
  /** Acesso ao backoffice (backoffice/painel admin). */
  isAdmin?: boolean;
}

/**
 * Dados da conta de acesso (`GET /auth/conta`). Separado do `Profile` porque o
 * e-mail não vive no documento do professor — ele existe só no Firebase Auth, e
 * buscá-lo no `GET /profile` (que roda em quase toda navegação) custaria uma
 * leitura extra em todas elas por causa de uma tela só.
 */
export interface ContaAuth {
  email: string;
  emailVerificado: boolean;
}

// --- Backoffice (Painel Administrativo) ---

/** Jogos com geração de conteúdo por IA (governança de prompts/limite). */
export type JogoIa = 'qlick' | 'wor' | 'isolateus';

/** Prompt de IA de um jogo, como o admin edita (template + default p/ restaurar). */
export interface PromptIaView {
  jogo: JogoIa;
  template: string;
  padrao: string;
  personalizado: boolean;
  atualizadoEm?: string;
}

/** Configuração global de IA (limite de gerações por dia por jogo). */
export interface ConfigIaView {
  limiteGeracoesDia: number;
  atualizadoEm?: string;
}

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

// --- Feedback (canal do professor + triagem do admin) ---

export type CategoriaFeedback = 'BUG' | 'SUGESTAO' | 'DUVIDA' | 'ELOGIO';
export type StatusFeedback = 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO';

/**
 * O que o professor manda. Identidade e timestamp não vão aqui: o backend os
 * resolve pelo token. `rota` e `userAgent` são o que só o navegador sabe.
 */
export interface EnviarFeedbackPayload {
  categoria: CategoriaFeedback;
  mensagem: string;
  rota: string;
  userAgent: string;
}

export interface Feedback {
  id: string;
  professorId: string;
  professorNome: string;
  professorEmail: string;
  categoria: CategoriaFeedback;
  mensagem: string;
  rota: string;
  userAgent: string;
  status: StatusFeedback;
  criadoEm: string;
  notaInterna?: string;
  atualizadoEm?: string;
  /** Ausente = o alerta por e-mail não saiu (chave ausente ou falha no envio). */
  notificadoEm?: string;
}

export interface TriarFeedbackPayload {
  status?: StatusFeedback;
  notaInterna?: string;
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
  /** Aula (1..N) fixada manualmente quando não há tópicos (ENH-001/002). */
  numeroAula?: number;
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
  numeroAula?: number;
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
  /**
   * Limiares de nível DA TURMA (XP para Prata/Ouro/Diamante/Platina). Vêm do
   * login: sem eles o painel do aluno exibiria a patente dos defaults, e não a
   * que o professor configurou.
   */
  niveis?: LimiaresNivel;
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
  /** Aula (1..N) fixada manualmente quando não há tópicos (ENH-001/002). */
  numeroAula?: number;
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
  numeroAula?: number;
  turmaIds?: string[];
  palavras: { palavra: string; dicas: string[] }[];
}

export type StatusMatch = 'LOBBY' | 'EM_ANDAMENTO' | 'ENCERRADO';

/** Gatilhos narrados por um Action Card (interrupção global de 3s). */
export type TipoAcaoGlobal =
  | 'ATAQUE'
  | 'CURA'
  | 'USURPACAO'
  | 'DANO_CRITICO'
  | 'DICA';

/**
 * Ação de impacto narrada em todas as telas ao mesmo tempo. Chega por fan-out:
 * na raiz (telão) e no doc de cada equipe (celular do aluno, que só escuta o seu).
 */
export interface LastGlobalAction {
  /** Incrementa a cada card — é o gatilho de exibição no cliente. */
  seq: number;
  tipo: TipoAcaoGlobal;
  mensagem: string;
  duracaoMs: number;
  em: string;
}

export interface WorTeam {
  id: string;
  matchId: string;
  nome: string;
  cor: string;
  hp: number;
  isHorde: boolean;
  /** Pontos de combate acumulados (dano causado + bônus). Desempata e vira XP. */
  pontos?: number;
  membros: { alunoId: string; nome: string }[];
  /** Último Action Card (fan-out) — como a narração global alcança o aluno. */
  lastGlobalAction?: LastGlobalAction | null;
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
  /** Último Action Card (narração global + congelamento de 3s). */
  lastGlobalAction?: LastGlobalAction | null;
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
  /** Pontos de combate acumulados (barra acima do HP). */
  pontos?: number;
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

// --- Tichr Isolateus ---

export interface QuestaoIsolateus {
  enunciado: string;
  alternativas: string[];
  corretaIndex: number;
}

export interface IsolateusJogo {
  id: string;
  professorId: string;
  nome: string;
  disciplina?: string;
  topicoId?: string;
  /** Aula (1..N) fixada manualmente quando não há tópicos (ENH-001/002). */
  numeroAula?: number;
  /** Turma única (legado). Substituída por `turmaIds` (N:N). */
  turmaId?: string;
  turmaIds?: string[];
  duracaoSegundos: number;
  questoes: QuestaoIsolateus[];
}

export interface CriarIsolateusPayload {
  nome: string;
  disciplina?: string;
  topicoId?: string;
  numeroAula?: number;
  turmaIds?: string[];
  duracaoSegundos?: number;
  questoes: QuestaoIsolateus[];
}

export type StatusIsolateus =
  | 'LOBBY'
  | 'TURNO_AMEACA'
  | 'QUESTAO_ATIVA'
  | 'RESULTADO_RODADA'
  | 'QUARENTENA_DEBATE'
  | 'QUARENTENA_VOTO'
  | 'ENCERRADO';

/**
 * Um habitante da vila. Real ou virtual — indistinguíveis aqui **de propósito**:
 * o servidor nunca marca quem é NPC, senão bastava abrir o DevTools para
 * dissolver a Névoa de Guerra. O aluno só sabe qual habitante é ele mesmo, e
 * isso vem do painel (rota autenticada), não deste documento.
 */
export interface Habitante {
  id: string;
  nome: string;
  vivo: boolean;
  preso: boolean;
}

export interface SetorVila {
  id: string;
  nome: string;
  intacto: boolean;
}

export interface Rumor {
  id: string;
  autorNome: string;
  texto: string;
  tipo: 'RUMOR' | 'FORJADO' | 'SINAL';
}

export interface MensagemDebate {
  id: string;
  autorNome: string;
  texto: string;
}

export interface AlertaRodada {
  tipo: 'SABOTAGEM' | 'ABDUCAO';
  texto: string;
}

export interface ResumoRodadaIsolateus {
  seq: number;
  defendida: boolean;
  texto: string;
}

export interface VereditoQuarentena {
  presoNome: string;
  eraAmeaca: boolean;
  texto: string;
}

export interface VereditoIsolateus {
  lado: 'VILA' | 'AMEACA';
  motivo: string;
}

export interface PlacarIsolateus {
  posicao: number;
  alunoId: string;
  nome: string;
  pontos: number;
}

/** A camada pública da partida (`isolateus_partidas/{id}`), lida por snapshot. */
export interface IsolateusMatch {
  id: string;
  jogoId: string;
  professorId: string;
  turmaId?: string;
  nome: string;
  status: StatusIsolateus;
  criadaEm?: string | null;

  esperanca: number;
  setores: SetorVila[];
  habitantes: Habitante[];

  rodada: number;
  totalRodadas: number;
  duracaoSegundos: number;
  /** Início da fase cronometrada (questão, debate ou votação) — base do relógio. */
  faseIniciadaEm?: string | null;

  /** A questão no ar, SEM a alternativa correta. */
  questaoPublica?: { enunciado: string; alternativas: string[] } | null;
  /** Só chega preenchida quando a rodada é resolvida. */
  corretaIndex?: number | null;

  alerta?: AlertaRodada | null;
  rumores: Rumor[];
  debate: MensagemDebate[];
  resumoRodada?: ResumoRodadaIsolateus | null;

  /** Rodada da última Quarentena (null = nenhuma). Cabe uma por rodada. */
  quarentenaRodada?: number | null;
  vereditoQuarentena?: VereditoQuarentena | null;
  votosRecebidos: number;
  /** Quantos já pularam o debate — só a contagem; quem pulou é segredo. */
  pulosRecebidos?: number;

  /** Pseudônimos do lobby — o backend esvazia esta lista ao iniciar. */
  inscritos: { alunoId: string; nome: string }[];

  veredito?: VereditoIsolateus | null;
  /** O placar só é publicado no encerramento (ao vivo, denunciaria os reais). */
  rankingFinal: PlacarIsolateus[];
}

/**
 * O que o aluno sabe sobre si mesmo. Vem por REST autenticado — **nunca** pelo
 * snapshot. Só a Ameaça recebe `corretaIndex` e `disfarces`.
 */
export interface PainelIsolateus {
  papel: 'ALDEAO' | 'AMEACA';
  habitanteId: string;
  vivo: boolean;
  preso: boolean;
  corretaIndex?: number;
  disfarces?: string[];
}
