import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DocumentoLegal } from '../../core/legal.data';

/**
 * Renderiza um documento legal (Termos ou Privacidade) a partir do dado
 * estruturado. Dumb/OnPush — reusado na página dedicada e no modal de aceite
 * do cadastro. Sem cabeçalho de navegação (a página/modal cuida do wrapper).
 */
@Component({
  selector: 'app-legal-doc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc(); as d) {
      <h1 class="doc__titulo">{{ d.titulo }}</h1>
      <p class="doc__meta">Versão {{ d.versao }} · atualizado em {{ d.atualizadoEm }}</p>
      <p class="doc__resumo">{{ d.resumo }}</p>

      @for (s of d.secoes; track s.titulo) {
        <section class="doc__sec">
          <h2 class="doc__sectitulo">{{ s.titulo }}</h2>
          @for (p of s.paragrafos; track $index) {
            <p class="doc__p">{{ p }}</p>
          }
        </section>
      }

      <p class="doc__aviso">
        Este texto é uma minuta que reflete as regras do produto e não constitui
        aconselhamento jurídico. Em caso de dúvida, consulte um profissional do Direito.
      </p>
    }
  `,
  styles: `
    :host { display: block; }
    .doc__titulo { margin: 0 0 0.25rem; font-size: 1.6rem; font-weight: 800; }
    .doc__meta { margin: 0 0 1rem; font-size: 0.82rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .doc__resumo { margin: 0 0 1.5rem; color: var(--text-muted); }
    .doc__sec { margin-bottom: 1.25rem; }
    .doc__sectitulo { margin: 0 0 0.4rem; font-size: 1.05rem; font-weight: 700; }
    .doc__p { margin: 0 0 0.5rem; line-height: 1.6; }
    .doc__aviso {
      margin: 1.5rem 0 0;
      padding: 0.75rem 0.9rem;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      font-size: 0.85rem;
      color: var(--text-muted);
      background: var(--surface-alt);
    }
  `,
})
export class LegalDoc {
  readonly doc = input<DocumentoLegal>();
}
