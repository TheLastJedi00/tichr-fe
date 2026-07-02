/**
 * Ambiente de PRODUCAO (default do build).
 * O frontend nao conhece o Firebase: fala apenas com a API do backend,
 * que e o dono das credenciais e o intermediario do login.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://tichr-be.vercel.app',
};
