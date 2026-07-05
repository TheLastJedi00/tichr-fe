import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApiService } from '../../core/admin-api.service';
import { CriarCupomPayload, Cupom, PlanoAtual, TipoCupom } from '../../core/models';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

const PLANOS: PlanoAtual[] = ['ESTAGIARIO', 'GRADUADO', 'MESTRE', 'PHD'];

/** Motor de cupons: lista + criação (100% de desconto ou meses grátis). */
@Component({
  selector: 'app-admin-cupons-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Icon, Spinner],
  template: `
    <header class="head">
      <span class="tag"><app-icon name="sparkles" [size]="15" /> Backoffice</span>
      <h1>Cupons</h1>
    </header>

    <app-card title="Novo cupom">
      <form class="form" (submit)="$event.preventDefault(); criar()">
        <label class="campo">
          <span>Código</span>
          <input class="tichr-input" [value]="codigo()" (input)="codigo.set($any($event.target).value)" placeholder="VOLTA2026" />
        </label>

        <label class="campo">
          <span>Tipo</span>
          <select class="tichr-input" [value]="tipo()" (change)="tipo.set($any($event.target).value)">
            <option value="PLANO_GRATIS">Plano grátis</option>
            <option value="MESES_GRATIS">Meses grátis</option>
          </select>
        </label>

        <label class="campo">
          <span>Plano concedido</span>
          <select class="tichr-input" [value]="plano()" (change)="plano.set($any($event.target).value)">
            @for (p of planos; track p) {
              <option [value]="p">{{ rotulo(p) }}</option>
            }
          </select>
        </label>

        @if (tipo() === 'MESES_GRATIS') {
          <label class="campo">
            <span>Meses grátis</span>
            <input class="tichr-input" type="number" min="1" [value]="meses()" (input)="meses.set(+$any($event.target).value)" />
          </label>
        }

        <label class="campo">
          <span>Limite de usos (vazio = ilimitado)</span>
          <input class="tichr-input" type="number" min="1" [value]="maxUsos() ?? ''" (input)="setMax($any($event.target).value)" />
        </label>

        @if (erro()) { <p class="erro">{{ erro() }}</p> }
        <button class="btn-primary" type="submit" [disabled]="salvando()">
          {{ salvando() ? 'Salvando…' : 'Criar cupom' }}
        </button>
      </form>
    </app-card>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <ul class="lista">
        @for (c of cupons(); track c.id) {
          <li class="cupom">
            <div class="cupom__top">
              <strong class="cod">{{ c.codigo }}</strong>
              <span class="badge" [class.off]="!c.ativo">{{ c.ativo ? 'Ativo' : 'Inativo' }}</span>
            </div>
            <span class="desc">
              {{ c.tipo === 'PLANO_GRATIS' ? 'Plano ' + rotulo(c.planoConcedido) : c.meses + ' mês(es) grátis' }}
              · {{ c.usos }}{{ c.maxUsos ? '/' + c.maxUsos : '' }} usos
            </span>
            <div class="cupom__acoes">
              <button class="btn-outline" type="button" (click)="alternar(c)">{{ c.ativo ? 'Desativar' : 'Ativar' }}</button>
              <button class="btn-outline warn" type="button" (click)="remover(c)">Excluir</button>
            </div>
          </li>
        } @empty {
          <p class="vazio">Nenhum cupom criado ainda.</p>
        }
      </ul>
    }
  `,
  styles: `
    .head { margin-bottom: 1rem; }
    .tag { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 700; color: var(--primary); }
    .head h1 { margin: 0.25rem 0 0; font-size: 1.4rem; }
    .form { display: flex; flex-direction: column; gap: 0.75rem; }
    .campo { display: flex; flex-direction: column; gap: 0.35rem; }
    .campo > span { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .erro { color: var(--danger); margin: 0; font-size: 0.85rem; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    .lista { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.6rem; }
    .cupom {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .cupom__top { display: flex; align-items: center; gap: 0.5rem; }
    .cod { font-family: monospace; font-size: 1.05rem; letter-spacing: 0.05em; }
    .badge { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; margin-left: auto; background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
    .badge.off { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }
    .desc { font-size: 0.85rem; color: var(--text-muted); }
    .cupom__acoes { display: flex; gap: 0.5rem; }
    .btn-outline.warn { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); }
    .vazio { color: var(--text-muted); text-align: center; padding: 1.5rem; }
  `,
})
export class AdminCuponsPage {
  private readonly api = inject(AdminApiService);

  protected readonly planos = PLANOS;
  protected readonly cupons = signal<Cupom[]>([]);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly codigo = signal('');
  protected readonly tipo = signal<TipoCupom>('PLANO_GRATIS');
  protected readonly plano = signal<PlanoAtual>('PHD');
  protected readonly meses = signal(1);
  protected readonly maxUsos = signal<number | null>(null);

  constructor() {
    this.carregar();
  }

  protected setMax(v: string): void {
    this.maxUsos.set(v ? +v : null);
  }

  private carregar(): void {
    this.carregando.set(true);
    this.api.cupons().subscribe({
      next: (c) => {
        this.cupons.set(c);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected criar(): void {
    if (this.codigo().trim().length < 3) {
      this.erro.set('Informe um código com ao menos 3 caracteres.');
      return;
    }
    this.erro.set(null);
    this.salvando.set(true);
    const payload: CriarCupomPayload = {
      codigo: this.codigo().trim(),
      tipo: this.tipo(),
      planoConcedido: this.plano(),
      meses: this.tipo() === 'MESES_GRATIS' ? this.meses() : undefined,
      maxUsos: this.maxUsos() ?? undefined,
    };
    this.api.criarCupom(payload).subscribe({
      next: () => {
        this.codigo.set('');
        this.maxUsos.set(null);
        this.salvando.set(false);
        this.carregar();
      },
      error: () => {
        this.erro.set('Não foi possível criar (código duplicado?).');
        this.salvando.set(false);
      },
    });
  }

  protected alternar(c: Cupom): void {
    this.api.atualizarCupom(c.id, { ativo: !c.ativo }).subscribe(() => this.carregar());
  }

  protected remover(c: Cupom): void {
    if (!confirm(`Excluir o cupom ${c.codigo}?`)) return;
    this.api.removerCupom(c.id).subscribe(() => this.carregar());
  }

  protected rotulo(p?: PlanoAtual): string {
    if (!p) return '—';
    return { ESTAGIARIO: 'Estagiário', GRADUADO: 'Graduado', MESTRE: 'Mestre', PHD: 'PhD' }[p];
  }
}
