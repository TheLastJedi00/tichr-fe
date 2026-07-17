/**
 * Ambiente de DESENVOLVIMENTO (configuração `development` — `ng serve` e o build
 * de staging). Aponta para a **API de staging** `dev.api.tichr.com.br`, o par do
 * ambiente de homologação (branch `stag`). Para rodar contra um backend LOCAL,
 * troque `apiBaseUrl` para `http://localhost:3000` na sua máquina.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'https://dev.api.tichr.com.br',
  firebase: {
    apiKey: 'AIzaSyBFjeDZ4Cq11GZEMgPJgNUHV75-zcDrh7g',
    projectId: 'tichr-293c8',
    authDomain: 'tichr-293c8.firebaseapp.com',
    storageBucket: 'tichr-293c8.firebasestorage.app',
  },
};
