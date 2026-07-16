/**
 * Ambiente de PRODUCAO (default do build).
 * O frontend nao conhece o Firebase: fala apenas com a API do backend,
 * que e o dono das credenciais e o intermediario do login.
 */
export const environment = {
  production: true,
  // api.tichr.com.br, e nao tichr-be.vercel.app: o cookie HttpOnly da sessao so
  // existe porque o front e a API compartilham o dominio registravel tichr.com.br
  // (mesmo site -> SameSite=Lax passa). Em *.vercel.app o cookie seria
  // third-party e morreria no Safari — vercel.app esta na Public Suffix List.
  apiBaseUrl: 'https://api.tichr.com.br',
  // Config web pública do Firebase — usada SÓ para ler as partidas do Qlick em
  // tempo real (onSnapshot). O restante continua via API do backend.
  firebase: {
    apiKey: 'AIzaSyBFjeDZ4Cq11GZEMgPJgNUHV75-zcDrh7g',
    projectId: 'tichr-293c8',
    authDomain: 'tichr-293c8.firebaseapp.com',
    // Bucket do Storage (foto de perfil). Confirme o nome exato no console
    // ao habilitar o Storage — pode ser `tichr-293c8.appspot.com` (legado).
    storageBucket: 'tichr-293c8.firebasestorage.app',
  },
};
