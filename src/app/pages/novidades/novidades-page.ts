import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoriaMudanca, CHANGELOG } from '../../core/changelog.data';

/** Página de Novidades (Changelog): timeline das versões do Tichr. */
@Component({
  selector: 'app-novidades-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <a class="voltar" routerLink="/">← Voltar</a>
      <h1 class="title">O que há de novo</h1>
      <p class="lead">O histórico de evolução do Tichr, versão a versão.</p>

      <div class="timeline">
        @for (v of versoes; track v.versao) {
          <article class="versao">
            <div class="versao__head">
              <span class="versao__tag">{{ v.versao }}</span>
              <span class="versao__titulo">{{ v.titulo }}</span>
              <span class="versao__data">{{ v.data }}</span>
            </div>
            <ul class="itens">
              @for (item of v.itens; track item.texto) {
                <li class="item">
                  <span class="cat cat--{{ classe(item.categoria) }}">{{ item.categoria }}</span>
                  <span>{{ item.texto }}</span>
                </li>
              }
            </ul>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .wrap { max-width: 720px; margin: 0 auto; padding: 2rem 1rem 3rem; }
    .voltar { color: var(--primary); font-weight: 600; }
    .title { margin: 0.75rem 0 0.25rem; font-size: 1.75rem; font-weight: 800; }
    .lead { margin: 0 0 1.5rem; color: var(--text-muted); }
    .timeline { display: flex; flex-direction: column; gap: 1rem; }
    .versao { border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: var(--radius); background: var(--surface); padding: 1rem 1.1rem; }
    .versao__head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.6rem; }
    .versao__tag { font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; }
    .versao__titulo { font-weight: 700; }
    .versao__data { margin-left: auto; color: var(--text-muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    .itens { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .item { display: flex; align-items: baseline; gap: 0.6rem; }
    .cat { flex: 0 0 auto; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.12rem 0.45rem; border-radius: 999px; }
    .cat--feature { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .cat--melhoria { color: var(--success); background: color-mix(in srgb, var(--success) 12%, transparent); }
    .cat--correcao { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); }
  `,
})
export class NovidadesPage {
  protected readonly versoes = CHANGELOG;

  protected classe(cat: CategoriaMudanca): string {
    return { 'Nova feature': 'feature', Melhoria: 'melhoria', Correção: 'correcao' }[cat];
  }
}
