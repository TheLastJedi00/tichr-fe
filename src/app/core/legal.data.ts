/**
 * Conteúdo dos documentos legais (Termos de Uso e Política de Privacidade).
 * Fonte única, consumida pelas páginas `/termos` e `/privacidade` e pelos modais
 * de aceite no cadastro. A versão vigente (`VERSAO_LEGAL`) espelha a registrada
 * no backend no consentimento do cadastro (`versaoDocumentosLegais`).
 *
 * AVISO: este é um texto-minuta (template) que reflete as regras do produto —
 * NÃO constitui aconselhamento jurídico. Recomenda-se revisão por um advogado
 * antes do uso em produção.
 */
export interface SecaoLegal {
  titulo: string;
  paragrafos: string[];
}

export interface DocumentoLegal {
  titulo: string;
  versao: string;
  atualizadoEm: string; // 'YYYY-MM-DD'
  resumo: string;
  secoes: SecaoLegal[];
}

/** Versão vigente dos documentos (deve casar com o backend no consentimento). */
export const VERSAO_LEGAL = 'v1';

const ATUALIZADO_EM = '2026-07-16';

export const POLITICA_PRIVACIDADE: DocumentoLegal = {
  titulo: 'Política de Privacidade',
  versao: VERSAO_LEGAL,
  atualizadoEm: ATUALIZADO_EM,
  resumo:
    'Como o Tichr coleta, usa e protege os dados no ecossistema, em conformidade ' +
    'com a Lei Geral de Proteção de Dados (LGPD).',
  secoes: [
    {
      titulo: '1. Papéis no tratamento de dados',
      paragrafos: [
        'O Tichr atua legalmente como Operador de Dados, tratando as informações em nome e sob as instruções do professor titular da conta.',
        'O Professor titular da conta assume o papel de Controlador de Dados em relação às informações de seus alunos, sendo responsável pelas decisões de coleta e uso desses dados dentro da plataforma.',
      ],
    },
    {
      titulo: '2. Dados do Professor (Controlador)',
      paragrafos: [
        'Coletamos e armazenamos o nome, o e-mail e a senha do professor. A senha é gerenciada e criptografada pelo provedor de autenticação (Firebase Authentication), não sendo acessível em texto puro pela plataforma.',
        'Esses dados são usados para autenticação, identificação da conta, comunicação sobre o serviço e prestação das funcionalidades contratadas.',
      ],
    },
    {
      titulo: '3. Telemetria e Analytics',
      paragrafos: [
        'Coletamos, de forma transparente, métricas de uso, interações de interface e localização aproximada (nível regional), por meio de ferramentas de Analytics.',
        'Esses dados são usados estritamente para fins de performance, estabilidade e melhoria da experiência de uso (UX), não sendo utilizados para identificar individualmente os usuários fora desse contexto.',
      ],
    },
    {
      titulo: '4. Dados dos Alunos (Plano PhD)',
      paragrafos: [
        'Nas funcionalidades de gamificação do plano PhD, a plataforma processa nomes ou apelidos dos alunos, a geração de PINs de acesso e métricas de engajamento (XP e pontuações em jogos).',
        'Esses dados existem para viabilizar o portal do aluno, os rankings e as dinâmicas interativas dentro da turma do professor.',
      ],
    },
    {
      titulo: '5. Responsabilidade do Controlador',
      paragrafos: [
        'É responsabilidade exclusiva do Professor (Controlador) obter as devidas autorizações da instituição de ensino ou dos responsáveis legais antes de inserir identificadores dos alunos nas dinâmicas de gamificação.',
        'Ao cadastrar dados de alunos, o professor declara possuir base legal e autorização para tal.',
      ],
    },
    {
      titulo: '6. Direito de exclusão',
      paragrafos: [
        'O Professor possui o direito e a autonomia para solicitar a exclusão definitiva de sua conta, com a limpeza dos registros atrelados no banco de dados.',
        'A solicitação de exclusão pode ser feita pelos canais de contato da plataforma; após a exclusão, os dados são removidos ressalvadas as obrigações legais de retenção.',
      ],
    },
    {
      titulo: '7. Segurança e armazenamento',
      paragrafos: [
        'Os dados são armazenados na infraestrutura do Firebase (Google Cloud), com controles de acesso e regras de segurança que restringem a leitura e a escrita conforme o perfil do usuário.',
        'Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados contra acesso não autorizado, perda ou alteração indevida.',
        'Ao entrar na sua conta, guardamos no seu navegador um cookie de sessão e um código de acesso temporário. Eles servem exclusivamente para manter você conectado e evitar que a senha seja pedida a cada tela — não acompanham sua navegação fora do Tichr nem alimentam publicidade. Por serem necessários ao funcionamento do serviço que você pediu, não dependem de consentimento (art. 7º, V, da LGPD: execução de contrato). Ao sair da conta, os dois são apagados. O Tichr não usa cookies de análise, rastreamento ou marketing.',
      ],
    },
    {
      titulo: '8. Alterações desta política',
      paragrafos: [
        'Esta política pode ser atualizada para refletir mudanças no produto ou na legislação. A versão vigente e sua data de atualização são sempre exibidas no topo do documento.',
      ],
    },
  ],
};

export const TERMOS_DE_USO: DocumentoLegal = {
  titulo: 'Termos de Uso',
  versao: VERSAO_LEGAL,
  atualizadoEm: ATUALIZADO_EM,
  resumo:
    'As regras de uso do Tichr: modelo de assinatura, responsabilidades, ' +
    'propriedade intelectual e condições comerciais do serviço.',
  secoes: [
    {
      titulo: '1. Modelo de prestação do serviço',
      paragrafos: [
        'O Tichr opera sob um formato de assinaturas em níveis de acesso, com um nível gratuito e níveis pagos.',
        'Cada nível possui restrições técnicas específicas de quantidade de turmas e de ferramentas disponíveis. Ao assinar, o usuário concorda com os limites e recursos do plano contratado.',
      ],
    },
    {
      titulo: '2. Proteção de infraestrutura (Rate Limit)',
      paragrafos: [
        'A funcionalidade de geração de enigmas e dicas por Inteligência Artificial possui um limite de segurança rígido por usuário.',
        'Tentativas de fraude, automação robótica ou engenharia reversa para burlar esse limite resultarão na suspensão imediata da conta.',
      ],
    },
    {
      titulo: '3. Conteúdo gerado pelo usuário',
      paragrafos: [
        'O Professor é inteiramente responsável pelo teor das palavras, dicas e planos de aula cadastrados na plataforma.',
        'Não é permitido inserir conteúdo ilegal, ofensivo ou que viole direitos de terceiros.',
      ],
    },
    {
      titulo: '4. Propriedade intelectual',
      paragrafos: [
        'O motor de gamificação, a interface gráfica, a marca e a arquitetura das dinâmicas interativas (como o Tichr Wor) são propriedades exclusivas da plataforma.',
        'O uso do serviço não transfere ao usuário qualquer direito sobre esses ativos.',
      ],
    },
    {
      titulo: '5. Downgrade e inadimplência',
      paragrafos: [
        'O cancelamento de uma assinatura paga ou a falha no faturamento não acarretam a exclusão punitiva dos dados excedentes.',
        'Turmas, jogos criados e históricos de gamificação atrelados a planos superiores são mantidos no banco de dados, porém com o acesso bloqueado na interface até a regularização do plano.',
      ],
    },
    {
      titulo: '6. Aceitação e alterações',
      paragrafos: [
        'Ao criar uma conta, o usuário declara ter lido e concordado com estes Termos de Uso e com a Política de Privacidade.',
        'Estes termos podem ser atualizados; a versão vigente e sua data são exibidas no topo do documento. O uso continuado do serviço após alterações implica concordância com a versão atualizada.',
      ],
    },
  ],
};
