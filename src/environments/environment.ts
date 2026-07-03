/**
 * Ambiente de PRODUCAO (default do build).
 * O frontend nao conhece o Firebase: fala apenas com a API do backend,
 * que e o dono das credenciais e o intermediario do login.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://tichr-be.vercel.app',
  // Config web pública do Firebase — usada SÓ para ler as partidas do Qlick em
  // tempo real (onSnapshot). O restante continua via API do backend.
  firebase: {
    apiKey: 'AIzaSyBFjeDZ4Cq11GZEMgPJgNUHV75-zcDrh7g',
    projectId: 'tichr-293c8',
    authDomain: 'tichr-293c8.firebaseapp.com',
  },
};
