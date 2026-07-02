import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/theme.service';
import { Icon } from '../../ui/icon/icon';
import { IconButton } from '../../ui/icon-button/icon-button';

interface AulaDemo {
  numero: number;
  data: string;
}

const BASE = ['02 mar', '09 mar', '16 mar', '23 mar', '30 mar'];
const DESLIZADO = ['02 mar', '09 mar', '23 mar', '30 mar', '06 abr'];

/**
 * Landing page (standalone, rota /). Explica o conceito de deslizamento
 * com uma demonstracao interativa em tempo real (CSS transitions).
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, IconButton, RouterLink],
  template: `
    <header class="topbar">
      <span class="logo">Tichr</span>
      <div class="topbar__actions">
        <a class="btn-outline" routerLink="/login">Entrar</a>
        <app-icon-button
          [name]="theme.theme() === 'dark' ? 'sun' : 'moon'"
          variant="ghost"
          ariaLabel="Alternar tema"
          (clicked)="theme.toggle()"
        />
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <h1>A agenda que se adapta à sua aula, e não o contrário.</h1>
      <p class="sub">
        Feita para quem dá aulas fixas ou cursos modulares. Lance um imprevisto
        e veja sua grade se reorganizar inteira em um segundo.
      </p>
      <a class="btn-primary hero__cta" href="#waitlist">Solicitar acesso beta</a>
      <p class="hero__login">
        Já tem acesso beta?
        <a routerLink="/login">Entrar</a>
      </p>
    </section>

    <!-- Demo interativa -->
    <section class="demo">
      <h2>Veja o deslizamento acontecer</h2>
      <div class="demo__box">
        @for (aula of primeiras(); track aula.numero) {
          <div class="aula">
            <span class="aula__n">Aula {{ aula.numero }}</span>
            <span class="aula__d">{{ aula.data }}</span>
          </div>
        }

        @if (imprevisto()) {
          <div class="excecao">
            <app-icon name="alert" [size]="16" /> Imprevisto: Sessão de RPG 🎲
          </div>
        }

        @for (aula of ultimas(); track aula.numero) {
          <div class="aula" [class.aula--shift]="imprevisto()">
            <span class="aula__n">Aula {{ aula.numero }}</span>
            <span class="aula__d">{{ aula.data }}</span>
          </div>
        }
      </div>

      <button class="btn-primary demo__btn" type="button" (click)="toggle()">
        {{ imprevisto() ? 'Resetar demonstração' : 'Ops, surgiu um imprevisto!' }}
      </button>
      <p class="demo__msg">
        Você foca em ensinar. O Tichr recalcula a data de término do módulo
        automaticamente.
      </p>
    </section>

    <!-- Dois mundos -->
    <section class="mundos">
      <div class="mundo">
        <app-icon name="building" [size]="28" />
        <h3>Escola pública / Grade contínua</h3>
        <p>
          Configure seus dias na semana e tenha o cronograma do ano inteiro
          projetado. Feriados suspendem a aula sem quebrar sua grade.
        </p>
      </div>
      <div class="mundo">
        <app-icon name="rocket" [size]="28" />
        <h3>Cursos livres / Módulos fechados</h3>
        <p>
          Começou uma turma de 10 aulas hoje? O Tichr calcula o dia exato do
          fim. Precisou remarcar? O término é recalculado na hora.
        </p>
      </div>
    </section>

    <!-- Social proof -->
    <section class="proof">
      <span>Chega de planilhas engessadas.</span>
      <span>Tema claro e escuro nativos.</span>
      <span>De professor para professor.</span>
    </section>

    <!-- CTA final / waitlist -->
    <section id="waitlist" class="final">
      <h2>Assuma o controle do seu tempo.</h2>
      @if (naLista()) {
        <p class="ok">✓ Você está na lista de espera. Em breve entramos em contato!</p>
      } @else {
        <form class="wl" (submit)="$event.preventDefault(); entrar()">
          <input
            class="tichr-input"
            type="email"
            placeholder="seu@email.com"
            [value]="email()"
            (input)="email.set($any($event.target).value)"
            required
          />
          <button class="btn-primary" type="submit">Entrar na lista</button>
        </form>
      }
    </section>

    <footer class="rodape">
      <span class="logo">Tichr</span>
      <span class="muted">© 2026 — Todos os direitos reservados.</span>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      max-width: 820px;
      margin: 0 auto;
      padding: 0 1.25rem 4rem;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 0;
    }
    .topbar__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .topbar__actions .btn-outline {
      text-decoration: none;
    }
    .logo {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .hero {
      text-align: center;
      padding: 3rem 0 2.5rem;
    }
    .hero h1 {
      margin: 0;
      font-size: clamp(2rem, 6vw, 3.25rem);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.03em;
    }
    .sub {
      max-width: 520px;
      margin: 1.25rem auto 1.75rem;
      color: var(--text-muted);
      font-size: 1.05rem;
    }
    .hero__cta {
      text-decoration: none;
      font-size: 1.05rem;
      padding: 0.75rem 1.5rem;
    }
    .hero__login {
      margin: 1rem 0 0;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .hero__login a {
      font-weight: 600;
    }
    section {
      margin-bottom: 3.5rem;
    }
    h2 {
      text-align: center;
      font-size: 1.6rem;
      font-weight: 700;
      margin: 0 0 1.5rem;
    }
    .demo__box {
      max-width: 380px;
      margin: 0 auto 1.25rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      padding: 0.5rem;
    }
    .aula {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0.875rem;
      border-radius: var(--radius);
      transition:
        background-color 0.4s ease,
        transform 0.4s ease;
    }
    .aula + .aula {
      margin-top: 0.25rem;
    }
    .aula--shift {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .aula__n {
      font-weight: 600;
    }
    .aula__d {
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    .excecao {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.25rem 0;
      padding: 0.625rem 0.875rem;
      font-weight: 600;
      color: var(--danger);
      background: color-mix(in srgb, var(--danger) 10%, transparent);
      border-radius: var(--radius);
    }
    .demo__btn {
      display: block;
      margin: 0 auto;
      cursor: pointer;
    }
    .demo__msg {
      text-align: center;
      max-width: 440px;
      margin: 1rem auto 0;
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .mundos {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media (min-width: 640px) {
      .mundos {
        grid-template-columns: 1fr 1fr;
      }
    }
    .mundo {
      padding: 1.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--primary);
    }
    .mundo h3 {
      margin: 0.75rem 0 0.5rem;
      color: var(--text);
      font-size: 1.15rem;
    }
    .mundo p {
      margin: 0;
      color: var(--text-muted);
    }
    .proof {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem 2rem;
      text-align: center;
      font-weight: 600;
      color: var(--text-muted);
    }
    .final {
      text-align: center;
    }
    .wl {
      display: flex;
      gap: 0.5rem;
      max-width: 420px;
      margin: 0 auto;
      flex-wrap: wrap;
    }
    .wl .tichr-input {
      flex: 1 1 200px;
    }
    .ok {
      color: var(--success);
      font-weight: 600;
    }
    .rodape {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }
    .muted {
      color: var(--text-muted);
      font-size: 0.85rem;
    }
  `,
})
export class LandingPage {
  protected readonly theme = inject(ThemeService);

  protected readonly imprevisto = signal(false);
  protected readonly email = signal('');
  protected readonly naLista = signal(false);

  private readonly aulas = computed<AulaDemo[]>(() => {
    const datas = this.imprevisto() ? DESLIZADO : BASE;
    return datas.map((data, i) => ({ numero: i + 1, data }));
  });

  protected readonly primeiras = computed(() => this.aulas().slice(0, 2));
  protected readonly ultimas = computed(() => this.aulas().slice(2));

  protected toggle(): void {
    this.imprevisto.update((v) => !v);
  }

  protected entrar(): void {
    if (this.email().includes('@')) {
      this.naLista.set(true);
    }
  }
}
