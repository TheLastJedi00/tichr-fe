/**
 * Ambiente LOCAL (configuração `local` — `ng serve --configuration local`).
 * Aponta para um backend rodando na própria máquina (`localhost:3000`), para
 * desenvolvimento full-stack local. O `development` mira a API de staging
 * (`dev.api.tichr.com.br`); use este quando quiser o backend local.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  firebase: {
    apiKey: 'AIzaSyBFjeDZ4Cq11GZEMgPJgNUHV75-zcDrh7g',
    projectId: 'tichr-293c8',
    authDomain: 'tichr-293c8.firebaseapp.com',
    storageBucket: 'tichr-293c8.firebasestorage.app',
  },
};
