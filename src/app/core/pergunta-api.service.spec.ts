import { erroDoArquivo, tamanhoLegivel } from './pergunta-api.service';

/** Spec 037 #13/#14: o FE recusa antes de enviar o que o backend recusaria. */
describe('perguntas: validação local do anexo', () => {
  const arq = (nome: string, bytes: number) => new File([new Uint8Array(bytes)], nome);

  it('aceita HTML, CSS, PDF e Word', () => {
    for (const n of ['a.html', 'a.HTM', 'a.css', 'a.pdf', 'a.doc', 'a.docx']) {
      expect(erroDoArquivo(arq(n, 10))).toBeNull();
    }
  });

  it('recusa imagem e outros tipos', () => {
    for (const n of ['foto.png', 'foto.jpg', 'x.exe', 'semext']) {
      expect(erroDoArquivo(arq(n, 10))).toContain('Imagens não são aceitas');
    }
  });

  it('recusa vazio e acima de 4 MB', () => {
    expect(erroDoArquivo(arq('a.pdf', 0))).toContain('vazio');
    expect(erroDoArquivo(arq('a.pdf', 4 * 1024 * 1024 + 1))).toContain('4 MB');
  });

  it('mostra o tamanho legível', () => {
    expect(tamanhoLegivel(340 * 1024)).toBe('340 KB');
    expect(tamanhoLegivel(1.25 * 1024 * 1024)).toBe('1,3 MB');
  });
});
