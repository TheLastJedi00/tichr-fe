import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/**
 * Soft-block do onboarding (dumb): card em destaque no painel pedindo a conclusão
 * do perfil (nome, @username e foto) para "liberar todas as ferramentas".
 * A lógica (o que falta) vem da Page via inputs.
 */
@Component({
  selector: 'app-onboarding-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    <div class="ob">
      <div class="ob__head">
        <app-icon name="sparkles" [size]="22" />
        <div>
          <h3>Falta pouco!</h3>
          <p>Conclua a configuração do seu perfil para liberar todas as ferramentas.</p>
        </div>
      </div>

      <ul class="ob__check">
        <li [class.done]="!faltaNome()">
          <app-icon [name]="faltaNome() ? 'user' : 'check'" [size]="16" />
          <span>Seu nome</span>
        </li>
        <li [class.done]="!faltaUsername()">
          <app-icon [name]="faltaUsername() ? 'user' : 'check'" [size]="16" />
          <span>Nome de usuário (&#64;)</span>
        </li>
        <li [class.done]="!faltaFoto()">
          <app-icon [name]="faltaFoto() ? 'user' : 'check'" [size]="16" />
          <span>Foto de perfil</span>
        </li>
        <li [class.done]="!faltaDisciplinas()">
          <app-icon [name]="faltaDisciplinas() ? 'book' : 'check'" [size]="16" />
          <span>Suas disciplinas</span>
        </li>
      </ul>

      <a class="btn-primary ob__cta" routerLink="/configuracoes/perfil">
        Completar meu perfil
      </a>
    </div>
  `,
  styles: `
    .ob {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--primary) 8%, var(--surface));
      padding: 1.25rem;
    }
    .ob__head {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      color: var(--primary);
    }
    .ob__head h3 {
      margin: 0 0 0.25rem;
      font-size: 1.05rem;
    }
    .ob__head p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .ob__check {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .ob__check li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.92rem;
      color: var(--text-muted);
    }
    .ob__check li.done {
      color: var(--success, #16a34a);
      text-decoration: line-through;
      opacity: 0.75;
    }
    .ob__cta {
      align-self: flex-start;
    }
  `,
})
export class OnboardingCard {
  readonly faltaNome = input(false);
  readonly faltaUsername = input(false);
  readonly faltaFoto = input(false);
  readonly faltaDisciplinas = input(false);
}
