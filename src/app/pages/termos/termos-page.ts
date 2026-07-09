import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TERMOS_DE_USO } from '../../core/legal.data';
import { LegalDoc } from '../../ui/legal-doc/legal-doc';

/** Página pública dos Termos de Uso (padrão da página de Novidades). */
@Component({
  selector: 'app-termos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LegalDoc],
  template: `
    <div class="wrap">
      <a class="voltar" routerLink="/">← Voltar</a>
      <app-legal-doc [doc]="doc" />
    </div>
  `,
  styles: `
    .wrap { max-width: 720px; margin: 0 auto; padding: 2rem 1rem 3rem; }
    .voltar { display: inline-block; margin-bottom: 1rem; color: var(--primary); font-weight: 600; }
  `,
})
export class TermosPage {
  protected readonly doc = TERMOS_DE_USO;
}
