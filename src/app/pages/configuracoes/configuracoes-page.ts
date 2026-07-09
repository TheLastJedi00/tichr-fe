import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/profile.service';
import { Avatar } from '../../ui/avatar/avatar';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Hub de Configurações (índice). Deixou de ser o formulário direto: agora é um
 * cabeçalho com o avatar + nome do professor e um menu de acesso às áreas de
 * gestão da conta (Meu Perfil / Meu Plano).
 */
@Component({
  selector: 'app-configuracoes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Avatar, Icon, Spinner],
  template: `
    <h1 class="title">Configurações</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <header class="hero">
        <app-avatar [nome]="profile()?.nomeExibicao" [url]="profile()?.avatarUrl" [size]="96" />
        <p class="hero__nome">{{ profile()?.nomeExibicao || 'Professor(a)' }}</p>
        @if (profile()?.username) {
          <p class="hero__user">&#64;{{ profile()?.username }}</p>
        }
      </header>

      <nav class="menu">
        <a class="menu__item" routerLink="/configuracoes/perfil">
          <span class="menu__ic"><app-icon name="user" [size]="22" /></span>
          <span class="menu__txt">
            <strong>Meu Perfil</strong>
            <small>Dados pessoais, foto, usuário e disciplinas</small>
          </span>
          <span class="menu__go" aria-hidden="true">›</span>
        </a>
        <a class="menu__item" routerLink="/configuracoes/plano">
          <span class="menu__ic"><app-icon name="rocket" [size]="22" /></span>
          <span class="menu__txt">
            <strong>Meu Plano</strong>
            <small>Assinatura, upgrade e cobrança</small>
          </span>
          <span class="menu__go" aria-hidden="true">›</span>
        </a>
        <a class="menu__item" routerLink="/termos">
          <span class="menu__ic"><app-icon name="book" [size]="22" /></span>
          <span class="menu__txt">
            <strong>Termos de Uso</strong>
            <small>As regras de uso do Tichr</small>
          </span>
          <span class="menu__go" aria-hidden="true">›</span>
        </a>
        <a class="menu__item" routerLink="/privacidade">
          <span class="menu__ic"><app-icon name="shield" [size]="22" /></span>
          <span class="menu__txt">
            <strong>Política de Privacidade</strong>
            <small>Como seus dados são tratados (LGPD)</small>
          </span>
          <span class="menu__go" aria-hidden="true">›</span>
        </a>
        @if (profile()?.isAdmin) {
          <a class="menu__item admin" routerLink="/admin">
            <span class="menu__ic"><app-icon name="settings" [size]="22" /></span>
            <span class="menu__txt">
              <strong>Painel Admin</strong>
              <small>Backoffice: métricas, usuários e cupons</small>
            </span>
            <span class="menu__go" aria-hidden="true">›</span>
          </a>
        }
      </nav>
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 0 1.5rem;
    }
    .hero__nome { margin: 0.25rem 0 0; font-size: 1.2rem; font-weight: 800; }
    .hero__user { margin: 0; color: var(--text-muted); font-weight: 600; }
    .menu { display: grid; gap: 0.6rem; }
    .menu__item {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.9rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .menu__item:hover { border-color: var(--primary); transform: translateY(-1px); }
    .menu__item:active { transform: translateY(0); }
    .menu__item.admin {
      border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
      background: color-mix(in srgb, var(--primary) 5%, var(--surface));
    }
    .menu__ic {
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
    }
    .menu__txt { display: flex; flex-direction: column; gap: 0.15rem; }
    .menu__txt strong { font-size: 1rem; }
    .menu__txt small { color: var(--text-muted); font-size: 0.82rem; }
    .menu__go { margin-left: auto; font-size: 1.5rem; color: var(--text-muted); line-height: 1; }
  `,
})
export class ConfiguracoesPage {
  private readonly profileService = inject(ProfileService);

  protected readonly profile = this.profileService.profile;
  protected readonly carregando = signal(true);

  constructor() {
    // Reaproveita o perfil já em cache; senão busca (avatar + nome do cabeçalho).
    if (this.profile()) {
      this.carregando.set(false);
    } else {
      this.profileService.load().subscribe({
        next: () => this.carregando.set(false),
        error: () => this.carregando.set(false),
      });
    }
  }
}
