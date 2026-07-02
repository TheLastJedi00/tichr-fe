import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Turma } from './models';
import { limiteDoPlano, turmaContaComoAtiva } from './plano.util';
import { ProfileService } from './profile.service';
import { TurmaApiService } from './turma-api.service';

/**
 * Estado global de consumo de cota do plano. Deriva o limite do perfil
 * (signal do ProfileService) e conta as turmas que ocupam vaga. Alimenta o
 * <app-quota-tracker> no menu lateral.
 */
@Injectable({ providedIn: 'root' })
export class QuotaService {
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);

  private readonly turmas = signal<Turma[]>([]);

  /** Turmas que ocupam cota agora. */
  readonly ativas = computed(
    () => this.turmas().filter((t) => turmaContaComoAtiva(t)).length,
  );

  /** Limite efetivo do plano (Infinity = ilimitado). */
  readonly limite = computed(() => limiteDoPlano(this.profileService.profile()));

  /** True quando o plano e ilimitado (Mestre/PhD). */
  readonly ilimitado = computed(() => this.limite() === Infinity);

  /** True quando o professor ja bateu o limite. */
  readonly noLimite = computed(
    () => !this.ilimitado() && this.ativas() >= this.limite(),
  );

  /** Recarrega as turmas para recalcular o consumo. */
  refresh(): Observable<Turma[]> {
    return this.api.getTurmas().pipe(tap((turmas) => this.turmas.set(turmas)));
  }
}
