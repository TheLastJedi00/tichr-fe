import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/theme.service';
import { Icon } from '../../ui/icon/icon';
import { IconButton } from '../../ui/icon-button/icon-button';
import { RevealDirective } from '../../ui/reveal.directive';

interface AulaDemo {
  numero: number;
  data: string;
}

const BASE = ['02 mar', '09 mar', '16 mar', '23 mar', '30 mar'];
const DESLIZADO = ['02 mar', '09 mar', '23 mar', '30 mar', '06 abr'];

/**
 * Landing page (standalone, rota /). Vitrine de alto impacto do Tichr:
 * hero com gradiente animado, demonstracao viva do deslizamento, diferenciais
 * por cenario e a trilha academica de planos. Ver .specs/update/landing-page.md.
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, IconButton, RouterLink, RevealDirective],
  template: `
    <!-- ===== Hero (A Promessa) ===== -->
    <section class="hero">
      <header class="topbar container">
        <span class="logo">Tichr</span>
        <div class="topbar__actions">
          <a class="btn-ghost-light" routerLink="/login">Entrar</a>
          <app-icon-button
            [name]="theme.theme() === 'dark' ? 'sun' : 'moon'"
            variant="ghost"
            ariaLabel="Alternar tema"
            (clicked)="theme.toggle()"
          />
        </div>
      </header>

      <div class="hero__inner container">
        <div class="hero__copy">
          <h1>A agenda que se adapta à sua aula, e não o contrário.</h1>
          <p class="hero__sub">
            Para professores regulares ou conteudistas. Lance um imprevisto e
            veja sua grade se reorganizar inteira em um segundo.
          </p>
          <a class="btn-glow" href="#planos">Descubra seu plano</a>
          <p class="hero__login">
            Já tem acesso beta? <a routerLink="/login">Entrar</a>
          </p>
        </div>

        <!-- Mockup flutuante do Tichr recalculando datas -->
        <div class="mockup" aria-hidden="true">
          <div class="mockup__bar">
            <span></span><span></span><span></span>
          </div>
          <div class="mockup__row"><span>Aula 03</span><b>16 mar</b></div>
          <div class="mockup__row mockup__row--alert">imprevisto ⚡</div>
          <div class="mockup__row mockup__row--moved"><span>Aula 03</span><b>23 mar</b></div>
          <div class="mockup__row mockup__row--moved"><span>Aula 04</span><b>30 mar</b></div>
        </div>
      </div>
    </section>

    <!-- ===== A Mágica (o deslizamento na prática) ===== -->
    <section class="magic" appReveal>
      <div class="container">
        <h2>Veja o deslizamento acontecer</h2>
        <p class="magic__lead">
          Cinco aulas na sua grade. Lance um imprevisto e veja os blocos
          deslizarem para as próximas datas válidas — em tempo real.
        </p>

        <div class="demo">
          @for (aula of aulas(); track aula.numero) {
            @if (aula.numero === 3 && imprevisto()) {
              <div class="excecao">
                <app-icon name="alert" [size]="16" /> Imprevisto: Conselho de classe
              </div>
            }
            <div class="aula" [class.aula--shift]="imprevisto() && aula.numero >= 3">
              <span class="aula__n">Aula {{ aula.numero }}</span>
              <span class="aula__d">{{ aula.data }}</span>
            </div>
          }
        </div>

        <button class="btn-primary demo__btn" type="button" (click)="toggle()">
          {{ imprevisto() ? 'Resetar demonstração' : 'Surgiu um imprevisto!' }}
        </button>
        <p class="magic__msg">
          Você foca em ensinar. O Tichr recalcula a data de término do módulo
          automaticamente.
        </p>
      </div>
    </section>

    <!-- ===== Rodapé ===== -->
    <footer class="rodape">
      <div class="container rodape__inner">
        <span class="logo">Tichr</span>
        <span class="muted">© 2026 — De professor para professor.</span>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }
    .container {
      width: 100%;
      max-width: 1080px;
      margin: 0 auto;
      padding: 0 1.25rem;
    }
    .logo {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    /* ===== Hero ===== */
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      color: #f1f5f9;
      background: linear-gradient(130deg, #0b1120 0%, #1e3a8a 45%, #0f172a 100%);
      background-size: 220% 220%;
      animation: heroShift 20s ease-in-out infinite;
      overflow: hidden;
    }
    @keyframes heroShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hero { animation: none; }
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 1.25rem;
      padding-bottom: 1.25rem;
    }
    .btn-ghost-light {
      font-weight: 600;
      color: #f1f5f9;
      padding: 0.5rem 0.9rem;
      border: 1px solid rgba(241, 245, 249, 0.3);
      border-radius: var(--radius);
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .btn-ghost-light:hover {
      background: rgba(241, 245, 249, 0.12);
      border-color: rgba(241, 245, 249, 0.6);
    }
    .hero__inner {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr;
      align-items: center;
      gap: 2.5rem;
      padding-top: 2rem;
      padding-bottom: 4rem;
    }
    @media (min-width: 860px) {
      .hero__inner { grid-template-columns: 1.1fr 0.9fr; }
    }
    .hero__copy h1 {
      margin: 0;
      font-size: clamp(2.25rem, 6vw, 4rem);
      font-weight: 800;
      line-height: 1.03;
      letter-spacing: -0.03em;
    }
    .hero__sub {
      max-width: 34rem;
      margin: 1.5rem 0 2rem;
      font-size: 1.15rem;
      color: rgba(226, 232, 240, 0.85);
    }
    .btn-glow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      color: #fff;
      padding: 0.9rem 2rem;
      border-radius: var(--radius);
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      box-shadow: 0 8px 30px rgba(37, 99, 235, 0.45);
      transition: transform 0.15s ease, box-shadow 0.2s ease;
    }
    .btn-glow:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(59, 130, 246, 0.65);
    }
    .hero__login {
      margin: 1.25rem 0 0;
      font-size: 0.95rem;
      color: rgba(226, 232, 240, 0.75);
    }
    .hero__login a {
      color: #fff;
      font-weight: 600;
      text-decoration: underline;
    }

    /* Mockup flutuante */
    .mockup {
      justify-self: center;
      width: min(320px, 100%);
      padding: 1rem;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.25);
      backdrop-filter: blur(8px);
      box-shadow: 0 24px 60px rgba(2, 6, 23, 0.5);
      animation: float 6s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .mockup { animation: none; }
    }
    .mockup__bar {
      display: flex;
      gap: 0.4rem;
      margin-bottom: 0.9rem;
    }
    .mockup__bar span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(148, 163, 184, 0.5);
    }
    .mockup__row {
      display: flex;
      justify-content: space-between;
      padding: 0.7rem 0.9rem;
      margin-top: 0.5rem;
      border-radius: 10px;
      background: rgba(148, 163, 184, 0.12);
      font-size: 0.95rem;
      color: #e2e8f0;
    }
    .mockup__row b { font-variant-numeric: tabular-nums; }
    .mockup__row--alert {
      justify-content: center;
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.15);
      font-weight: 600;
    }
    .mockup__row--moved {
      background: rgba(59, 130, 246, 0.22);
      color: #bfdbfe;
    }

    /* ===== A Mágica ===== */
    .magic {
      background: var(--surface-alt);
      padding: 4.5rem 0;
      text-align: center;
    }
    h2 {
      font-size: clamp(1.6rem, 3.5vw, 2.25rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.75rem;
    }
    .magic__lead {
      max-width: 34rem;
      margin: 0 auto 2rem;
      color: var(--text-muted);
    }
    .demo {
      max-width: 380px;
      margin: 0 auto 1.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      padding: 0.5rem;
      text-align: left;
    }
    .aula {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.8rem 0.9rem;
      border-radius: var(--radius);
      transition: background-color 0.45s ease, transform 0.45s ease;
    }
    .aula + .aula { margin-top: 0.25rem; }
    .aula--shift {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .aula__n { font-weight: 600; }
    .aula__d {
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    .excecao {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
      padding: 0.65rem 0.9rem;
      font-weight: 600;
      color: var(--danger);
      background: color-mix(in srgb, var(--danger) 10%, transparent);
      border-radius: var(--radius);
    }
    .demo__btn {
      margin: 0 auto;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.75rem 1.5rem;
    }
    .magic__msg {
      max-width: 34rem;
      margin: 1.25rem auto 0;
      color: var(--text-muted);
    }

    /* ===== Rodapé ===== */
    .rodape {
      padding: 2rem 0;
      background: var(--bg);
      border-top: 1px solid var(--border);
    }
    .rodape__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
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

  protected readonly aulas = computed<AulaDemo[]>(() => {
    const datas = this.imprevisto() ? DESLIZADO : BASE;
    return datas.map((data, i) => ({ numero: i + 1, data }));
  });

  protected toggle(): void {
    this.imprevisto.update((v) => !v);
  }

  protected entrar(): void {
    if (this.email().includes('@')) {
      this.naLista.set(true);
    }
  }
}
