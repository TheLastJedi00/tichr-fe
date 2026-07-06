import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { WorApiService } from '../../core/wor-api.service';
import { Spinner } from '../../ui/spinner/spinner';
import { WorLandingPage } from './wor-landing-page';
import { WorMeusPage } from './wor-meus-page';

/**
 * Home do Tichr Wor (rota `/jogos/wor`). Uma rota só: renderiza "Minhas
 * batalhas" se o professor já criou alguma, ou a landing de apresentação caso
 * contrário (ou se não for PhD). Mesmo padrão do Qlick — sem rota intermediária.
 */
@Component({
  selector: 'app-wor-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner, WorLandingPage, WorMeusPage],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (temJogos()) {
      <app-wor-meus-page />
    } @else {
      <app-wor-landing-page />
    }
  `,
  styles: `.loading { display: flex; justify-content: center; padding: 4rem 0; color: #b45309; }`,
})
export class WorHomePage {
  private readonly profileService = inject(ProfileService);
  private readonly api = inject(WorApiService);
  protected readonly carregando = signal(true);
  protected readonly temJogos = signal(false);

  private readonly ehPhd = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'PHD'),
  );

  constructor() {
    const decidir = () => {
      // Não-PhD nunca tem batalhas (criar é gated) → mostra a landing/upsell.
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
