import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Plano, PLANOS } from '../../core/planos.data';
import { ThemeService } from '../../core/theme.service';
import { Footer } from '../../ui/footer/footer';
import { Icon, IconName } from '../../ui/icon/icon';
import { IconButton } from '../../ui/icon-button/icon-button';
import { Modal } from '../../ui/modal/modal';
import { RevealDirective } from '../../ui/reveal.directive';

interface AulaDemo {
  numero: number;
  data: string;
}

const BASE = ['02 mar', '09 mar', '16 mar', '23 mar', '30 mar'];
const DESLIZADO = ['02 mar', '09 mar', '23 mar', '30 mar', '06 abr'];

/**
 * Landing page (rota /). Estrutura orientada a conversão: value proposition
 * clara no hero → problema/agitação (PAS) → como funciona (3 passos) → o
 * ecossistema (a agenda é só a ponta) → prova/garantias → planos com risk
 * reversal → objeções (FAQ) → CTA final. Ver .specs/update/landing-page.md.
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, IconButton, RouterLink, RevealDirective, Modal, Footer],
  template: `
    <!-- ===== Hero (Atenção + Value Proposition) ===== -->
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
          <span class="hero__eyebrow">A plataforma completa do professor</span>
          <h1>Toda a sua docência, <span class="grad">organizada sozinha</span>.</h1>
          <p class="hero__sub">
            A agenda que se reorganiza a cada imprevisto é só o começo. Some
            <strong>planejamento de aulas</strong>,
            <strong>gestão de turmas e equipes</strong> e um
            <strong>portal gamificado</strong>, num só lugar, feito de professor
            para professor.
          </p>
          <div class="hero__chips">
            <span><app-icon name="calendar" [size]="15" /> Agenda inteligente</span>
            <span><app-icon name="book" [size]="15" /> Plano de aula</span>
            <span><app-icon name="users" [size]="15" /> Turmas &amp; equipes</span>
            <span><app-icon name="trophy" [size]="15" /> Portal do aluno</span>
          </div>
          <div class="hero__cta">
            <a class="btn-glow" href="#planos">Começar grátis</a>
            <a class="btn-hero-sec" href="#como">Ver como funciona</a>
          </div>
          <p class="hero__reforco">Sem cartão de crédito · Grátis para começar</p>
        </div>

        <!-- Mockup flutuante do Tichr recalculando datas -->
        <div class="mockup" aria-hidden="true">
          <div class="mockup__bar"><span></span><span></span><span></span></div>
          <div class="mockup__row"><span>Aula 03</span><b>16 mar</b></div>
          <div class="mockup__row mockup__row--alert">
            <app-icon name="alert" [size]="14" /> imprevisto
          </div>
          <div class="mockup__row mockup__row--moved"><span>Aula 03</span><b>23 mar</b></div>
          <div class="mockup__row mockup__row--moved"><span>Aula 04</span><b>30 mar</b></div>
        </div>
      </div>
    </section>

    <!-- ===== Problema + Agitação (PAS) ===== -->
    <section class="problema" appReveal>
      <div class="container">
        <h2>Feriado, reunião, conselho de classe…</h2>
        <p class="problema__lead">
          E lá vai você remexer a grade inteira à mão: reposicionar cada aula,
          recalcular quando o curso termina, avisar os alunos. Planejamento numa
          planilha, chamada num caderno, notas em outro lugar. É trabalho demais
          para <em>ainda não ter dado aula nenhuma</em>.
        </p>
      </div>
    </section>

    <!-- ===== Como funciona (3 passos) + demo ===== -->
    <section id="como" class="como" appReveal>
      <div class="container">
        <h2>Como funciona</h2>
        <p class="como__lead">Em 3 passos, do caos ao controle.</p>
        <div class="passos">
          @for (p of passos; track p.n) {
            <article class="passo">
              <span class="passo__n">{{ p.n }}</span>
              <h3>{{ p.titulo }}</h3>
              <p>{{ p.texto }}</p>
            </article>
          }
        </div>

        <div class="demo-wrap">
          <p class="demo-wrap__tit">
            Veja o deslizamento acontecer <app-icon name="chevron-down" [size]="16" />
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
        </div>
      </div>
    </section>

    <!-- ===== O ecossistema (a agenda é só a ponta) ===== -->
    <section id="ecossistema" class="eco" appReveal>
      <div class="container">
        <div class="eco__intro">
          <span class="eco__eyebrow">A agenda é só a ponta do iceberg</span>
          <h2>Uma plataforma inteira sob a superfície</h2>
          <p class="eco__lead">
            O que te traz é a agenda que se resolve sozinha. O que te faz ficar é
            tudo o que vem por baixo dela.
          </p>
        </div>

        <div class="pilares">
          @for (p of pilares; track p.titulo) {
            <article class="pilar">
              <span class="pilar__icon"><app-icon [name]="p.icone" [size]="28" /></span>
              <div>
                <h3>{{ p.titulo }}</h3>
                <p>{{ p.texto }}</p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>

    <!-- ===== Demos interativas: ranking + conexão ===== -->
    <section id="experimente" class="demos" appReveal>
      <div class="container">
        <h2>Toque e veja funcionando</h2>
        <p class="demos__lead">A gamificação e o acesso do aluno, ao vivo.</p>
        <div class="demos__grid">
          <!-- Ranking ao vivo -->
          <article class="democ">
            <h3>Ranking da turma</h3>
            <ul class="rank">
              @for (a of alunosRank(); track a.id) {
                <li class="rank__row" [class.rank__row--eu]="a.id === 'duda'">
                  <span class="rank__pos rank__pos--{{ $index + 1 }}">{{ $index + 1 }}</span>
                  <span class="rank__nome">{{ a.nome }}</span>
                  <span class="rank__bar"><span [style.width.%]="pctXp(a.xp)"></span></span>
                  <span class="rank__xp">{{ a.xp }}</span>
                </li>
              }
            </ul>
            <button class="btn-primary democ__btn" type="button" (click)="recompensar()">
              {{ recompensado() ? 'Resetar demonstração' : 'Recompensar Duda (+190)' }}
            </button>
          </article>

          <!-- Conexão aluno e professor -->
          <article class="democ">
            <h3>Conexão aluno e professor</h3>
            <div class="conx">
              <div class="conx__node">
                <span class="conx__av"><app-icon name="user" [size]="20" /></span>
                <span class="conx__lbl">professor</span>
                <strong>&#64;prof.marina</strong>
              </div>
              <div class="conx__link" [class.conx__link--on]="conectado()">
                <span class="conx__dot"></span>
              </div>
              <div class="conx__node">
                <span class="conx__av conx__av--aluno"><app-icon name="user" [size]="20" /></span>
                <span class="conx__lbl">aluno</span>
                <strong>Duda</strong>
              </div>
            </div>

            @if (conectado()) {
              <div class="conx__portal">
                <span class="conx__ptit">Portal da Duda · Nível Ouro</span>
                <div class="conx__xp"><span></span></div>
                <span class="conx__meta">410 pts · vê a agenda, o plano e o ranking</span>
              </div>
            } @else {
              <p class="conx__hint">
                Sem e-mail: busca o &#64;professor, escolhe a turma e entra pelo PIN.
              </p>
            }

            <button class="btn-primary democ__btn" type="button" (click)="conectar()">
              {{ conectado() ? 'Desconectar' : 'Conectar aluno' }}
            </button>
          </article>
        </div>
      </div>
    </section>

    <!-- ===== Prova / Garantias (risk reversal) ===== -->
    <section class="prova" appReveal>
      <div class="container prova__grid">
        @for (g of garantias; track g.titulo) {
          <div class="garantia">
            <strong>{{ g.titulo }}</strong>
            <span>{{ g.texto }}</span>
          </div>
        }
      </div>
    </section>

    <!-- ===== Vitrine de Planos (progressão + risk reversal) ===== -->
    <section id="planos" class="planos" appReveal>
      <div class="container">
        <h2>Comece grátis e mergulhe quando quiser</h2>
        <p class="planos__lead">
          Cada plano abre mais da plataforma: do test-drive da agenda ao
          ecossistema multiplayer com seus alunos. Sem cartão para começar.
        </p>

        <div class="planos__track">
          @for (p of planos; track p.nome) {
            <article class="plano" [class.plano--destaque]="p.destaque">
              @if (p.destaque) {
                <span class="plano__badge">Mais popular</span>
              }
              <h3 class="plano__nome">{{ p.nome }}</h3>
              <p class="plano__preco">
                <strong>{{ p.preco }}</strong>
                @if (p.periodo) { <span>{{ p.periodo }}</span> }
              </p>
              <p class="plano__limite">{{ p.limite }}</p>
              <p class="plano__pitch">{{ p.pitch }}</p>
              <button class="plano__features" type="button" (click)="abrirPlano(p)">
                + Ver todas as features
              </button>
              <a
                class="plano__cta"
                [class.btn-primary]="p.destaque"
                [class.btn-outline]="!p.destaque"
                routerLink="/login"
              >
                {{ p.cta }}
              </a>
            </article>
          }
        </div>
      </div>
    </section>

    <!-- ===== Objeções (FAQ) ===== -->
    <section class="faq" appReveal>
      <div class="container container--estreito">
        <h2>Perguntas rápidas</h2>
        <div class="faq__lista">
          @for (f of faqs; track f.q) {
            <details class="faq__item">
              <summary>{{ f.q }}</summary>
              <p>{{ f.a }}</p>
            </details>
          }
        </div>
      </div>
    </section>

    <!-- ===== CTA final ===== -->
    <section id="final" class="final" appReveal>
      <div class="container">
        <h2>Sua próxima aula começa organizada.</h2>
        <p class="final__sub">
          Entre na lista e seja um dos primeiros professores a ter agenda,
          planejamento, turmas e portal do aluno num lugar só.
        </p>
        @if (naLista()) {
          <p class="final__ok">
            ✓ Você está na lista de espera. Em breve entramos em contato!
          </p>
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
            <button class="btn-glow" type="submit">Entrar na lista</button>
          </form>
        }
      </div>
    </section>

    <app-footer />

    <!-- CTA fixo no rodapé (apenas mobile) -->
    <a class="sticky-cta" href="#planos">Começar grátis</a>

    <!-- Modal de detalhes do plano (carregado sob demanda com @defer) -->
    @defer (when planoAberto()) {
      @if (planoAberto(); as p) {
        <app-modal [open]="true" [title]="p.nome" (close)="fecharPlano()">
          <p class="modal-preco">
            <strong>{{ p.preco }}</strong>{{ p.periodo }} · {{ p.limite }}
          </p>
          <ul class="feat-list">
            @for (f of p.features; track f) {
              <li>{{ f }}</li>
            }
          </ul>
          <a modal-actions class="btn-primary modal-cta" routerLink="/login">
            {{ p.cta }}
          </a>
        </app-modal>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .container { width: 100%; max-width: 1080px; margin: 0 auto; padding: 0 1.25rem; }
    .container--estreito { max-width: 760px; }
    .logo { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; }
    h2 { font-size: clamp(1.6rem, 3.5vw, 2.25rem); font-weight: 800; letter-spacing: -0.02em; margin: 0 0 0.75rem; }

    /* ===== Hero ===== */
    .hero {
      position: relative; min-height: 100vh; display: flex; flex-direction: column;
      color: #f1f5f9;
      background: linear-gradient(130deg, #0b1120 0%, #1e3a8a 45%, #0f172a 100%);
      background-size: 220% 220%; animation: heroShift 20s ease-in-out infinite; overflow: hidden;
    }
    @keyframes heroShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @media (prefers-reduced-motion: reduce) { .hero { animation: none; } }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding-block: 1.25rem; }
    .topbar__actions { display: flex; align-items: center; gap: 0.5rem; }
    .btn-ghost-light { font-weight: 600; color: #f1f5f9; padding: 0.5rem 0.9rem; border: 1px solid rgba(241, 245, 249, 0.3); border-radius: var(--radius); }
    .btn-ghost-light:hover { background: rgba(241, 245, 249, 0.12); border-color: rgba(241, 245, 249, 0.6); }
    .hero__inner { flex: 1; display: grid; grid-template-columns: 1fr; align-items: center; gap: 2.5rem; padding-block: 2rem 4rem; }
    @media (min-width: 860px) { .hero__inner { grid-template-columns: 1.1fr 0.9fr; } }
    .hero__eyebrow { display: inline-block; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #93c5fd; margin-bottom: 0.9rem; }
    .hero__copy h1 { margin: 0; font-size: clamp(2.25rem, 6vw, 4rem); font-weight: 800; line-height: 1.03; letter-spacing: -0.03em; }
    .grad { background: linear-gradient(120deg, #60a5fa, #a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .hero__sub { max-width: 34rem; margin: 1.4rem 0 1.5rem; font-size: 1.15rem; color: rgba(226, 232, 240, 0.88); }
    .hero__chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem; }
    .hero__chips span { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 600; padding: 0.35rem 0.7rem; border-radius: 999px; background: rgba(148, 163, 184, 0.16); border: 1px solid rgba(148, 163, 184, 0.25); }
    .hero__chips app-icon { color: #93c5fd; }
    .hero__cta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
    .btn-glow { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; color: #fff; padding: 0.9rem 2rem; border-radius: var(--radius); background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 8px 30px rgba(37, 99, 235, 0.45); transition: transform 0.15s ease, box-shadow 0.2s ease; }
    .btn-glow:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(59, 130, 246, 0.65); }
    .btn-hero-sec { font-weight: 600; color: #e2e8f0; padding: 0.9rem 1rem; }
    .btn-hero-sec:hover { color: #fff; text-decoration: underline; }
    .hero__reforco { margin: 1rem 0 0; font-size: 0.85rem; color: rgba(226, 232, 240, 0.7); }
    .hero__login { margin: 0.5rem 0 0; font-size: 0.95rem; color: rgba(226, 232, 240, 0.75); }
    .hero__login a { color: #fff; font-weight: 600; text-decoration: underline; }

    .mockup { justify-self: center; width: min(320px, 100%); padding: 1rem; border-radius: 16px; background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(148, 163, 184, 0.25); box-shadow: 0 24px 60px rgba(2, 6, 23, 0.5); animation: float 6s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    @media (prefers-reduced-motion: reduce) { .mockup { animation: none; } }
    .mockup__bar { display: flex; gap: 0.4rem; margin-bottom: 0.9rem; }
    .mockup__bar span { width: 10px; height: 10px; border-radius: 50%; background: rgba(148, 163, 184, 0.5); }
    .mockup__row { display: flex; justify-content: space-between; padding: 0.7rem 0.9rem; margin-top: 0.5rem; border-radius: 10px; background: rgba(148, 163, 184, 0.12); font-size: 0.95rem; color: #e2e8f0; }
    .mockup__row b { font-variant-numeric: tabular-nums; }
    .mockup__row--alert { justify-content: center; align-items: center; gap: 0.4rem; color: #fca5a5; background: rgba(239, 68, 68, 0.15); font-weight: 600; }
    .mockup__row--moved { background: rgba(59, 130, 246, 0.22); color: #bfdbfe; }

    /* ===== Problema ===== */
    .problema { padding: 4rem 0 3rem; text-align: center; }
    .problema__lead { max-width: 42rem; margin: 0 auto; color: var(--text-muted); font-size: 1.1rem; }

    /* ===== Como funciona ===== */
    .como { padding: 3rem 0 4.5rem; text-align: center; background: var(--surface-alt); }
    .como__lead { max-width: 34rem; margin: 0 auto 2.5rem; color: var(--text-muted); }
    .passos { display: grid; grid-template-columns: 1fr; gap: 1.25rem; text-align: left; }
    @media (min-width: 720px) { .passos { grid-template-columns: repeat(3, 1fr); } }
    .passo { padding: 1.5rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .passo__n { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 999px; font-weight: 800; color: var(--primary-contrast); background: var(--primary); }
    .passo h3 { margin: 0.75rem 0 0.4rem; font-size: 1.1rem; }
    .passo p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
    .demo-wrap { margin-top: 2.5rem; }
    .demo-wrap__tit { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; margin: 0 0 0.75rem; }
    .demo-wrap__tit app-icon { color: var(--primary); }
    .demo { max-width: 380px; margin: 0 auto 1.25rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 0.5rem; text-align: left; }
    .aula { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 0.9rem; border-radius: var(--radius); transition: background-color 0.45s ease, transform 0.45s ease; }
    .aula + .aula { margin-top: 0.25rem; }
    .aula--shift { background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .aula__n { font-weight: 600; }
    .aula__d { color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .excecao { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; padding: 0.65rem 0.9rem; font-weight: 600; color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, transparent); border-radius: var(--radius); }
    .demo__btn { margin: 0 auto; cursor: pointer; font-size: 1rem; padding: 0.75rem 1.5rem; }

    /* ===== Ecossistema ===== */
    .eco { padding: 4.5rem 0; }
    .eco__intro { text-align: center; }
    .eco__eyebrow { display: inline-block; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--primary); margin-bottom: 0.5rem; }
    .eco__lead { max-width: 36rem; margin: 0 auto 2.5rem; color: var(--text-muted); }
    .pilares { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media (min-width: 720px) { .pilares { grid-template-columns: 1fr 1fr; } }
    .pilar { display: flex; gap: 1rem; padding: 1.5rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); transition: transform 0.2s ease, border-color 0.2s ease; }
    .pilar:hover { transform: translateY(-3px); border-color: var(--primary); }
    .pilar__icon { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .pilar h3 { margin: 0 0 0.4rem; font-size: 1.15rem; }
    .pilar p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

    /* ===== Demos interativas ===== */
    .demos { padding: 4.5rem 0; background: var(--surface-alt); text-align: center; }
    .demos__lead { max-width: 34rem; margin: 0 auto 2.5rem; color: var(--text-muted); }
    .demos__grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; text-align: left; }
    @media (min-width: 800px) { .demos__grid { grid-template-columns: 1fr 1fr; } }
    .democ { display: flex; flex-direction: column; padding: 1.5rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
    .democ h3 { margin: 0 0 1rem; font-size: 1.15rem; }
    .democ__btn { margin-top: 1.25rem; align-self: flex-start; cursor: pointer; }

    /* Ranking */
    .rank { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .rank__row { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.5rem; border-radius: var(--radius); transition: background-color 0.4s ease; }
    .rank__row--eu { background: color-mix(in srgb, var(--primary) 10%, transparent); }
    .rank__pos { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 999px; font-size: 0.78rem; font-weight: 800; color: #fff; background: var(--text-muted); }
    .rank__pos--1 { background: #f59e0b; }
    .rank__pos--2 { background: #94a3b8; }
    .rank__pos--3 { background: #b45309; }
    .rank__nome { flex: 0 0 3.5rem; font-weight: 600; font-size: 0.9rem; }
    .rank__bar { flex: 1; height: 8px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .rank__bar span { display: block; height: 100%; border-radius: 999px; background: var(--primary); transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    .rank__xp { flex: 0 0 auto; font-weight: 700; font-size: 0.82rem; font-variant-numeric: tabular-nums; color: var(--primary); min-width: 2.5rem; text-align: right; }

    /* Conexão */
    .conx { display: flex; align-items: center; gap: 0.5rem; }
    .conx__node { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.15rem; text-align: center; }
    .conx__av { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 999px; color: var(--primary); background: color-mix(in srgb, var(--primary) 14%, transparent); }
    .conx__av--aluno { color: var(--success); background: color-mix(in srgb, var(--success) 16%, transparent); }
    .conx__lbl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
    .conx__node strong { font-size: 0.9rem; font-variant-numeric: tabular-nums; }
    .conx__link { flex: 0 0 56px; height: 2px; position: relative; background: repeating-linear-gradient(90deg, var(--border) 0 6px, transparent 6px 12px); }
    .conx__link--on { background: var(--primary); }
    .conx__dot { position: absolute; top: 50%; left: 0; width: 8px; height: 8px; border-radius: 999px; background: var(--primary); transform: translate(-2px, -50%); opacity: 0; transition: left 0.6s ease, opacity 0.3s ease; }
    .conx__link--on .conx__dot { left: 100%; opacity: 1; }
    @media (prefers-reduced-motion: reduce) { .conx__dot { transition: none; } }
    .conx__hint { margin: 1rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .conx__portal { margin-top: 1rem; padding: 0.8rem 0.9rem; border-radius: var(--radius); background: color-mix(in srgb, var(--success) 8%, transparent); border: 1px solid color-mix(in srgb, var(--success) 30%, transparent); }
    .conx__ptit { font-weight: 700; font-size: 0.9rem; }
    .conx__xp { height: 10px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; margin: 0.4rem 0; }
    .conx__xp span { display: block; height: 100%; width: 82%; border-radius: 999px; background: linear-gradient(90deg, #3b82f6, #22c55e); }
    .conx__meta { font-size: 0.82rem; color: var(--text-muted); }

    /* ===== Prova / garantias ===== */
    .prova { padding: 2.5rem 0; background: var(--surface-alt); }
    .prova__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center; }
    @media (min-width: 720px) { .prova__grid { grid-template-columns: repeat(4, 1fr); } }
    .garantia { display: flex; flex-direction: column; gap: 0.2rem; }
    .garantia strong { font-size: 1.05rem; color: var(--primary); }
    .garantia span { font-size: 0.85rem; color: var(--text-muted); }

    /* ===== Planos ===== */
    .planos { padding: 4.5rem 0 5rem; text-align: center; }
    .planos__lead { max-width: 38rem; margin: 0 auto 2.5rem; color: var(--text-muted); }
    .planos__track { display: flex; gap: 1rem; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: 0.5rem 0.25rem 1rem; margin: 0 -0.25rem; scrollbar-width: thin; }
    .plano { position: relative; flex: 0 0 82%; max-width: 320px; scroll-snap-align: center; display: flex; flex-direction: column; text-align: left; padding: 1.75rem 1.5rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
    @media (min-width: 960px) { .planos__track { display: grid; grid-template-columns: repeat(4, 1fr); overflow: visible; align-items: stretch; margin: 0; } .plano { flex: initial; max-width: none; } }
    .plano--destaque { border-color: var(--primary); box-shadow: 0 16px 44px color-mix(in srgb, var(--primary) 28%, transparent); }
    @media (min-width: 960px) { .plano--destaque { transform: scale(1.04); } }
    .plano__badge { position: absolute; top: -0.7rem; left: 1.5rem; padding: 0.25rem 0.7rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--primary-contrast); background: var(--primary); border-radius: 999px; }
    .plano__nome { margin: 0 0 0.75rem; font-size: 1.25rem; }
    .plano__preco { margin: 0; display: flex; align-items: baseline; gap: 0.3rem; }
    .plano__preco strong { font-size: 1.75rem; letter-spacing: -0.02em; }
    .plano__preco span { color: var(--text-muted); font-size: 0.9rem; }
    .plano__limite { margin: 0.75rem 0 0; font-weight: 600; color: var(--primary); }
    .plano__pitch { margin: 0.5rem 0 1.25rem; color: var(--text-muted); font-size: 0.95rem; }
    .plano__features { align-self: flex-start; margin-bottom: 1.25rem; padding: 0; font: inherit; font-weight: 600; font-size: 0.9rem; color: var(--primary); background: none; border: none; cursor: pointer; }
    .plano__features:hover { text-decoration: underline; }
    .plano__cta { margin-top: auto; text-decoration: none; width: 100%; }

    /* ===== FAQ ===== */
    .faq { padding: 4rem 0; background: var(--surface-alt); text-align: center; }
    .faq__lista { text-align: left; display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.5rem; }
    .faq__item { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 0.9rem 1.1rem; }
    .faq__item summary { cursor: pointer; font-weight: 700; list-style: none; }
    .faq__item summary::-webkit-details-marker { display: none; }
    .faq__item summary::after { content: '▸'; float: right; color: var(--primary); font-weight: 800; }
    .faq__item[open] summary::after { content: '▾'; }
    .faq__item p { margin: 0.7rem 0 0; color: var(--text-muted); }

    /* ===== CTA final ===== */
    .final { padding: 5rem 0; text-align: center; color: #f1f5f9; background: linear-gradient(130deg, #0b1120, #1e3a8a); }
    .final h2 { color: #fff; }
    .final__sub { max-width: 34rem; margin: 0 auto 2rem; color: rgba(226, 232, 240, 0.85); }
    .wl { display: flex; gap: 0.6rem; max-width: 460px; margin: 0 auto; flex-wrap: wrap; }
    .wl .tichr-input { flex: 1 1 220px; }
    .final__ok { font-weight: 600; color: #86efac; }

    /* ===== Sticky CTA (mobile) ===== */
    .sticky-cta { display: none; }
    @media (max-width: 640px) {
      .sticky-cta { display: flex; align-items: center; justify-content: center; position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 50; padding: 0.9rem 1rem; font-weight: 700; color: #fff; text-decoration: none; border-radius: 999px; background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 10px 30px rgba(37, 99, 235, 0.5); }
    }

    /* ===== Modal de plano ===== */
    .modal-preco { margin: 0 0 1rem; color: var(--text-muted); }
    .modal-preco strong { color: var(--text); font-size: 1.25rem; }
    .feat-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.6rem; }
    .feat-list li { position: relative; padding-left: 1.6rem; }
    .feat-list li::before { content: '✓'; position: absolute; left: 0; color: var(--success); font-weight: 700; }
    .modal-cta { text-decoration: none; }
  `,
})
export class LandingPage {
  protected readonly theme = inject(ThemeService);

  protected readonly passos: ReadonlyArray<{ n: number; titulo: string; texto: string }> = [
    {
      n: 1,
      titulo: 'Descreva a turma',
      texto: 'Dias da semana, modalidade e início. Nada de cadastrar aula por aula.',
    },
    {
      n: 2,
      titulo: 'O Tichr projeta e reorganiza',
      texto: 'A grade nasce pronta e se recalcula sozinha a cada feriado, reunião ou férias.',
    },
    {
      n: 3,
      titulo: 'Planeje, gerencie e engaje',
      texto: 'Plano de aula, turmas, equipes e portal do aluno: tudo conectado à mesma grade.',
    },
  ];

  protected readonly pilares: ReadonlyArray<{
    icone: IconName;
    titulo: string;
    texto: string;
  }> = [
    {
      icone: 'calendar',
      titulo: 'Agenda que se reorganiza sozinha',
      texto:
        'Grade fixa ou módulo fechado. Um imprevisto desliza a aula e recalcula o término do curso, sem retrabalho.',
    },
    {
      icone: 'book',
      titulo: 'Do plano macro ao tópico do dia',
      texto:
        'Escreva o syllabus da disciplina e arraste tópicos direto na grade. O tópico desliza junto com a aula quando ela se move.',
    },
    {
      icone: 'users',
      titulo: 'Sua turma, orquestrada',
      texto:
        'Lista de chamada, equipes montadas arrastando alunos, cargos por membro e sorteio de dinâmicas em segundos.',
    },
    {
      icone: 'trophy',
      titulo: 'Portal gamificado do aluno',
      texto:
        'Alunos entram por PIN, acompanham a grade, veem "o que já vimos / o que vem por aí" e sobem de nível com XP e ranking.',
    },
  ];

  protected readonly garantias: ReadonlyArray<{ titulo: string; texto: string }> = [
    { titulo: 'Grátis para começar', texto: 'Plano Estagiário sem custo' },
    { titulo: 'Sem cartão', texto: 'Nada de pagamento para testar' },
    { titulo: 'Aluno sem e-mail', texto: 'Acesso ao portal só com PIN' },
    { titulo: 'De professor p/ professor', texto: 'Feito para a rotina real da sala' },
  ];

  protected readonly faqs: ReadonlyArray<{ q: string; a: string }> = [
    {
      q: 'Preciso cadastrar cada aula na mão?',
      a: 'Não. Você descreve as regras da turma (dias, modalidade, início) e o Tichr projeta toda a grade e a reorganiza sozinho quando surge um imprevisto.',
    },
    {
      q: 'Serve para escola pública e para curso livre?',
      a: 'Sim. Grade fixa mantém o cronograma do ano; módulo fechado recalcula a data de término a cada bloqueio. As duas lógicas convivem.',
    },
    {
      q: 'Meus alunos precisam de conta ou e-mail?',
      a: 'Não. Eles entram no portal buscando o seu @usuário e digitando o PIN da turma e o PIN pessoal. Simples e sem senhas.',
    },
    {
      q: 'Tem custo para começar?',
      a: 'Não. O plano Estagiário é grátis e sem cartão. Você só sobe de plano quando quiser desbloquear planejamento, equipes ou gamificação.',
    },
    {
      q: 'Meu planejamento fica salvo?',
      a: 'Sim. Plano de aula, tópicos e alocações ficam guardados e acompanham a grade, inclusive quando as aulas deslizam.',
    },
  ];

  protected readonly planos = PLANOS;
  protected readonly planoAberto = signal<Plano | null>(null);

  protected readonly imprevisto = signal(false);
  protected readonly email = signal('');
  protected readonly naLista = signal(false);

  // Demo: ranking ao vivo (recompensar a Duda a faz subir ao topo).
  private readonly rankBase: ReadonlyArray<{ id: string; nome: string; xp: number }> = [
    { id: 'carla', nome: 'Carla', xp: 410 },
    { id: 'ana', nome: 'Ana', xp: 320 },
    { id: 'bruno', nome: 'Bruno', xp: 290 },
    { id: 'duda', nome: 'Duda', xp: 250 },
  ];
  protected readonly recompensado = signal(false);
  protected readonly alunosRank = computed(() =>
    this.rankBase
      .map((a) => ({
        ...a,
        xp: a.xp + (this.recompensado() && a.id === 'duda' ? 190 : 0),
      }))
      .sort((a, b) => b.xp - a.xp),
  );
  protected recompensar(): void {
    this.recompensado.update((v) => !v);
  }
  protected pctXp(xp: number): number {
    return Math.min(100, Math.round((xp / 460) * 100));
  }

  // Demo: conexão aluno e professor (portal sem e-mail).
  protected readonly conectado = signal(false);
  protected conectar(): void {
    this.conectado.update((v) => !v);
  }

  protected abrirPlano(plano: Plano): void {
    this.planoAberto.set(plano);
  }

  protected fecharPlano(): void {
    this.planoAberto.set(null);
  }

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
