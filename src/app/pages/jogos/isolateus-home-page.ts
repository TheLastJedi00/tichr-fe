import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { Spinner } from '../../ui/spinner/spinner';
import { IsolateusLandingPage } from './isolateus-landing-page';
import { IsolateusMeusPage } from './isolateus-meus-page';

/**
 * Home do Tichr Isolateus (rota `/jogos/isolateus`). Uma rota só: renderiza
 * "Minhas investigações" se o professor já criou alguma, ou a landing de
 * apresentação caso contrário (ou se não for PhD) — que é exatamente a condição
 * de "primeiro uso" da §10 da spec, sem precisar de uma flag no perfil.
 */
@Component({
  selector: 'app-isolateus-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner, IsolateusLandingPage, IsolateusMeusPage],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (temJogos()) {
      <app-isolateus-meus-page />
    } @else {
      <app-isolateus-landing-page />
    }
  `,
  styles: `.loading { display: flex; justify-content: center; padding: 4rem 0; color: #4d7c0f; }`,
})
export class IsolateusHomePage {
  private readonly profileService = inject(ProfileService);
  private readonly api = inject(IsolateusApiService);
  protected readonly carregando = signal(true);
  protected readonly temJogos = signal(false);

  private readonly ehPhd = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'PHD'),
  );

  constructor() {
    const decidir = () => {
      // Não-PhD nunca tem investigações (criar é gated) → mostra a landing/upsell.
      if (!this.ehPhd()) {
        this.carregando.set(false);
        return;
      }
      this.api.listarJogos().subscribe({
        next: (js) => {
          this.temJogos.set(js.length > 0);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });
    };
    if (this.profileService.profile()) {
      decidir();
    } else {
      this.profileService.load().subscribe({ next: decidir, error: decidir });
    }
  }
}
