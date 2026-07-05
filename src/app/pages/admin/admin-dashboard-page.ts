import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/admin-api.service';
import { AdminMetrics, PlanoAtual } from '../../core/models';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

const PLANOS: PlanoAtual[] = ['ESTAGIARIO', 'GRADUADO', 'MESTRE', 'PHD'];

/** Dashboard do backoffice: visão geral do negócio. */
@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, Spinner],
  template: `
    <header class="head">
      <span class="tag"><app-icon name="settings" [size]="15" /> Backoffice</span>
      <h1>Painel Admin</h1>
    </header>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (metrics(); as m) {
      <section class="stats">
        <div class="stat">
          <span class="stat__num">{{ m.totalProfessores }}</span>
          <span class="stat__lbl">Professores</span>
        </div>
        <div class="stat">
          <span class="stat__num">{{ m.ativos }}</span>
          <span class="stat__lbl">Ativos</span>
        </div>
        <div class="stat">
          <span class="stat__num">{{ m.desativados }}</span>
          <span class="stat__lbl">Desativados</span>
        </div>
      </section>

      <app-card title="Distribuição por plano">
        <ul class="planos">
          @for (p of planos; track p) {
            <li>
              <span class="planos__nome">{{ rotulo(p) }}</span>
              <span class="planos__val">{{ m.porPlano[p] }}</span>
            </li>
          }
        </ul>
      </app-card>

      <nav class="atalhos">
        <a class="atalho" routerLink="/admin/usuarios">
          <app-icon name="users" [size]="22" />
          <span>Usuários</span>
        </a>
        <a class="atalho" routerLink="/admin/cupons">
          <app-icon name="sparkles" [size]="22" />
          <span>Cupons</span>
        </a>
      </nav>
    }
  `,
  styles: `
    .head { margin-bottom: 1rem; }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
    }
    .head h1 { margin: 0.25rem 0 0; font-size: 1.4rem; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 0.5rem;
      background: var(--surface);
    }
    .stat__num { font-size: 1.6rem; font-weight: 800; }
    .stat__lbl { font-size: 0.8rem; color: var(--text-muted); }
    .planos { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
    .planos li {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--primary) 6%, var(--surface));
    }
    .planos__val { font-weight: 700; }
    .atalhos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .atalho {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-weight: 600;
      color: var(--text);
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .atalho:hover { border-color: var(--primary); transform: translateY(-2px); }
  `,
})
export class AdminDashboardPage {
  private readonly api = inject(AdminApiService);

  protected readonly planos = PLANOS;
  protected readonly metrics = signal<AdminMetrics | null>(null);
  protected readonly carregando = signal(true);

  constructor() {
    this.api.metrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected rotulo(p: PlanoAtual): string {
    return { ESTAGIARIO: 'Estagiário', GRADUADO: 'Graduado', MESTRE: 'Mestre', PHD: 'PhD' }[p];
  }
}
