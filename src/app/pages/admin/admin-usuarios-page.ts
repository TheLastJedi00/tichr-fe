import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApiService } from '../../core/admin-api.service';
import { PlanoAtual, UsuarioAdmin } from '../../core/models';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

const PLANOS: PlanoAtual[] = ['ESTAGIARIO', 'GRADUADO', 'MESTRE', 'PHD'];

/** CRM interno: busca de professores, uso e ações de suporte/dados/plano. */
@Component({
  selector: 'app-admin-usuarios-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal, Spinner],
  template: `
    <header class="head">
      <span class="tag"><app-icon name="users" [size]="15" /> Backoffice</span>
      <h1>Usuários</h1>
    </header>

    <form class="busca" (submit)="$event.preventDefault(); buscar()">
      <input
        class="tichr-input"
        placeholder="Buscar por nome, @username ou e-mail…"
        [value]="busca()"
        (input)="busca.set($any($event.target).value)"
      />
      <button class="btn-primary" type="submit">Buscar</button>
    </form>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <ul class="lista">
        @for (u of usuarios(); track u.uid) {
          <li class="card" (click)="abrir(u)">
            <div class="card__top">
              <strong>{{ u.nomeExibicao || u.email || 'Sem nome' }}</strong>
              @if (u.desativadoEm) { <span class="badge off">Desativado</span> }
              <span class="badge plano">{{ rotulo(u.planoAtual) }}</span>
            </div>
            @if (u.username) { <span class="user">&#64;{{ u.username }}</span> }
            <div class="uso">
              <span>{{ u.uso.turmasAtivas }} turmas</span>
              <span>{{ u.uso.alunos }} alunos</span>
              <span>{{ u.uso.qlicks }} Qlicks</span>
            </div>
          </li>
        } @empty {
          <p class="vazio">Nenhum professor encontrado.</p>
        }
      </ul>
    }

    @if (selecionado(); as u) {
      <app-modal [open]="true" [title]="u.nomeExibicao || u.email || 'Professor'" (close)="fechar()">
        <div class="det">
          @if (u.email) { <p class="linha"><span>E-mail</span><strong>{{ u.email }}</strong></p> }
          @if (u.username) { <p class="linha"><span>Username</span><strong>&#64;{{ u.username }}</strong></p> }
          <p class="linha"><span>Uso</span><strong>{{ u.uso.turmasAtivas }} turmas · {{ u.uso.alunos }} alunos · {{ u.uso.qlicks }} Qlicks</strong></p>

          <label class="grupo">
            <span>Plano (override)</span>
            <div class="row">
              <select class="tichr-input" [value]="planoSel()" (change)="planoSel.set($any($event.target).value)">
                @for (p of planos; track p) {
                  <option [value]="p">{{ rotulo(p) }}</option>
                }
              </select>
              <button class="btn-outline" type="button" (click)="aplicarPlano(u)">Aplicar</button>
            </div>
          </label>

          <div class="grupo">
            <span>Ações</span>
            <div class="acoes">
              <button class="btn-outline" type="button" (click)="resetSenha(u)">Redefinir senha</button>
              <button class="btn-outline" type="button" (click)="conceder(u, true)">Tornar admin</button>
              <button class="btn-outline" type="button" (click)="conceder(u, false)">Revogar admin</button>
              <button class="btn-outline warn" type="button" (click)="limpar(u)">Limpar dados</button>
              <button class="btn-outline warn" type="button" (click)="excluir(u, false)">Desativar conta</button>
              <button class="btn-danger" type="button" (click)="excluir(u, true)">Excluir tudo</button>
            </div>
          </div>

          @if (msg()) { <p class="msg">{{ msg() }}</p> }
        </div>
      </app-modal>
    }
  `,
  styles: `
    .head { margin-bottom: 1rem; }
    .tag { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 700; color: var(--primary); }
    .head h1 { margin: 0.25rem 0 0; font-size: 1.4rem; }
    .busca { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .busca .tichr-input { flex: 1; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: border-color 0.15s ease;
    }
    .card:hover { border-color: var(--primary); }
    .card__top { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .card__top strong { min-width: 0; }
    .badge { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .badge.plano { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); margin-left: auto; }
    .badge.off { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }
    .user { font-size: 0.82rem; color: var(--text-muted); }
    .uso { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.8rem; color: var(--text-muted); }
    .vazio { color: var(--text-muted); text-align: center; padding: 1.5rem; }
    .det { display: flex; flex-direction: column; gap: 0.85rem; }
    .linha { display: flex; justify-content: space-between; gap: 0.75rem; margin: 0; font-size: 0.9rem; }
    .linha span { color: var(--text-muted); }
    .grupo { display: flex; flex-direction: column; gap: 0.4rem; }
    .grupo > span { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .row { display: flex; gap: 0.5rem; }
    .row .tichr-input { flex: 1; }
    .acoes { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .btn-outline.warn { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); }
    .btn-danger {
      grid-column: 1 / -1;
      border: none;
      border-radius: var(--radius);
      background: var(--danger);
      color: #fff;
      font-weight: 700;
      padding: 0.6rem 0.85rem;
      cursor: pointer;
      transition: filter 0.15s ease;
    }
    .btn-danger:hover { filter: brightness(0.92); }
    .msg { margin: 0; font-size: 0.85rem; color: var(--primary); }
    @media (min-width: 560px) { .acoes { grid-template-columns: repeat(3, 1fr); } }
  `,
})
export class AdminUsuariosPage {
  private readonly api = inject(AdminApiService);

  protected readonly planos = PLANOS;
  protected readonly busca = signal('');
  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly carregando = signal(true);
  protected readonly selecionado = signal<UsuarioAdmin | null>(null);
  protected readonly planoSel = signal<PlanoAtual>('ESTAGIARIO');
  protected readonly msg = signal<string | null>(null);

  constructor() {
    this.buscar();
  }

  protected buscar(): void {
    this.carregando.set(true);
    this.api.usuarios(this.busca().trim() || undefined).subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected abrir(u: UsuarioAdmin): void {
    this.selecionado.set(u);
    this.planoSel.set(u.planoAtual);
    this.msg.set(null);
  }

  protected fechar(): void {
    this.selecionado.set(null);
  }

  protected aplicarPlano(u: UsuarioAdmin): void {
    this.api.alterarPlano(u.uid, this.planoSel()).subscribe(() => {
      this.msg.set(`Plano alterado para ${this.rotulo(this.planoSel())}.`);
      this.buscar();
    });
  }

  protected resetSenha(u: UsuarioAdmin): void {
    this.api.resetSenha(u.uid).subscribe((r) =>
      this.msg.set(`E-mail de redefinição enviado para ${r.email}.`),
    );
  }

  protected conceder(u: UsuarioAdmin, valor: boolean): void {
    this.api.definirAdmin(u.uid, valor).subscribe(() =>
      this.msg.set(valor ? 'Acesso admin concedido.' : 'Acesso admin revogado.'),
    );
  }

  protected limpar(u: UsuarioAdmin): void {
    if (!confirm(`Apagar todas as turmas, alunos e Qlicks de ${u.nomeExibicao || u.email}? O login é mantido.`)) {
      return;
    }
    this.api.limparDados(u.uid).subscribe((r) => {
      this.msg.set(`Dados limpos: ${r.turmas} turmas e ${r.qlicks} Qlicks removidos.`);
      this.buscar();
    });
  }

  protected excluir(u: UsuarioAdmin, hard: boolean): void {
    const aviso = hard
      ? `EXCLUIR DEFINITIVAMENTE ${u.nomeExibicao || u.email}? Remove dados e login.`
      : `Desativar a conta de ${u.nomeExibicao || u.email}? O login é mantido.`;
    if (!confirm(aviso)) return;
    this.api.excluir(u.uid, hard).subscribe(() => {
      this.fechar();
      this.buscar();
    });
  }

  protected rotulo(p: PlanoAtual): string {
    return { ESTAGIARIO: 'Estagiário', GRADUADO: 'Graduado', MESTRE: 'Mestre', PHD: 'PhD' }[p];
  }
}
