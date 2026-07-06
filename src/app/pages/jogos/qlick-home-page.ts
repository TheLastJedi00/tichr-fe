import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Spinner } from '../../ui/spinner/spinner';
import { QlickIntroPage } from './qlick-intro-page';
import { QlickListPage } from './qlick-list-page';

/**
 * Home do Tichr Qlick (rota `/jogos/qlick`). Uma rota só, sem redirecionar por
 * uma página intermediária (que causava loop no "voltar"): decide o que
 * renderizar — a lista "Meus Qlicks" se o professor já criou algum, ou a
 * landing de apresentação caso contrário (ou se não for PhD).
 */
@Component({
  selector: 'app-qlick-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner, QlickIntroPage, QlickListPage],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (temQlicks()) {
      <app-qlick-list-page />
    } @else {
      <app-qlick-intro-page />
    }
  `,
  styles: `.loading { display: flex; justify-content: center; padding: 4rem 0; color: var(--primary); }`,
})
export class QlickHomePage {
  private readonly profileService = inject(ProfileService);
  private readonly api = inject(TurmaApiService);
  protected readonly carregando = signal(true);
  protected readonly temQlicks = signal(false);

  private readonly ehPhd = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'PHD'),
  );

  constructor() {
    const decidir = () => {
      // Não-PhD nunca tem Qlicks (criar é gated) → mostra a landing/upsell.
      if (!this.ehPhd()) {
        this.carregando.set(false);
        return;
      }
      this.api.getQlicks().subscribe({
        next: (qs) => {
          this.temQlicks.set(qs.length > 0);
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
