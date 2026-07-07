import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Plano, PLANOS } from '../../core/planos.data';
import { ThemeService } from '../../core/theme.service';
import { Avatar } from '../../ui/avatar/avatar';
import { Footer } from '../../ui/footer/footer';
import { Icon } from '../../ui/icon/icon';
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
 * Landing page (rota /). Rebranding orientado a gamificação (spec 009):
 * hero com mockup do Tichr Qlick → desfile "feature por seção" (A Qlick,
 * B acesso por PIN, C ranking/Hall da Fama, D equipes, E plano de aula,
 * F agenda de apoio, alternando lado no desktop e empilhando no mobile) →
 * planos → FAQ → CTA final. Mockups em CSS puro, sem emojis (<app-icon>).
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, IconButton, RouterLink, RevealDirective, Modal, Footer, Avatar],
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
          <span class="hero__eyebrow">Uma arena de jogos para a sala de aula</span>
          <h1>Transforme aulas comuns em <span class="grad">experiências inesquecíveis</span>.</h1>
          <p class="hero__sub">
            Jogos ao vivo, ranking e um portal onde <strong>a turma toda
            participa</strong>. Do quiz relâmpago à batalha de castelos, engaje
            seus alunos e mantenha a competição saudável — do primeiro toque ao
            Hall da Fama.
          </p>
          <div class="hero__chips">
            <span><app-icon name="game" [size]="15" /> Quiz ao vivo</span>
            <span><app-icon name="castle" [size]="15" /> Batalha de palavras</span>
            <span><app-icon name="medal" [size]="15" /> Ranking &amp; XP</span>
            <span><app-icon name="users" [size]="15" /> Equipes</span>
          </div>
          <div class="hero__cta">
            <a class="btn-glow" routerLink="/cadastro">Comece grátis agora</a>
            <a class="btn-hero-sec" href="#jogos">Conheça os jogos</a>
          </div>
          <p class="hero__reforco">Sem cartão de crédito · Grátis para começar</p>
        </div>

        <!-- Mockup de celular com a tela do Tichr Qlick (CSS puro) -->
        <div class="phone" aria-hidden="true">
          <div class="phone__screen">
            <span class="phone__tag"><app-icon name="game" [size]="13" /> Tichr Qlick</span>
            <p class="phone__q">Qual a capital do Brasil?</p>
            <div class="phone__opts">
              <span class="opt opt--a">A · Rio</span>
              <span class="opt opt--b">B · Brasília</span>
              <span class="opt opt--c">C · São Paulo</span>
              <span class="opt opt--d">D · Salvador</span>
            </div>
            <div class="phone__foot">
              <span class="phone__timer"></span>
              <span class="phone__live">● ao vivo</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Arena de Jogos (os dois jogos + "mais em breve") ===== -->
    <section id="jogos" class="arena" appReveal>
      <div class="container">
        <span class="arena__eyebrow"><app-icon name="dice" [size]="15" /> Arena de jogos</span>
        <h2>Não é só um quiz. É uma arena de jogos ao vivo.</h2>
        <p class="arena__lead">
          Cada jogo tem a sua mecânica, mas o palco é o mesmo: a sala toda
          jogando junta, pelo celular, sem instalar nada. E o arsenal só cresce.
        </p>

        <div class="arena__grid">
          <!-- Tichr Qlick -->
          <article class="gcard gcard--qlick">
            <span class="gcard__ic"><app-icon name="game" [size]="24" /></span>
            <span class="gcard__tag">Quiz ao vivo</span>
            <h3 class="gcard__nome">Tichr Qlick</h3>
            <p class="gcard__desc">
              Perguntas de múltipla escolha na tela, cada aluno responde em
              botões coloridos e o placar sobe na hora. A turma vibra junto.
            </p>
            <span class="gcard__meta gcard__meta--phd">
              <app-icon name="trophy" [size]="14" /> Plano PhD
            </span>
          </article>

          <!-- Tichr Wor -->
          <article class="gcard gcard--wor">
            <span class="gcard__ic"><app-icon name="castle" [size]="24" /></span>
            <span class="gcard__tag">Guerra de palavras</span>
            <h3 class="gcard__nome">Tichr Wor</h3>
            <p class="gcard__desc">
              Equipes defendem castelos e revidam com letras e palavras. Errar
              dói, acertar ataca o rival — a revisão da matéria vira batalha épica.
            </p>
            <span class="gcard__meta gcard__meta--phd">
              <app-icon name="trophy" [size]="14" /> Plano PhD
            </span>
          </article>

          <!-- Mais em breve -->
          <article class="gcard gcard--soon">
            <span class="gcard__ic"><app-icon name="sparkles" [size]="24" /></span>
            <span class="gcard__tag">Em breve</span>
            <h3 class="gcard__nome">Novos jogos</h3>
            <p class="gcard__desc">
              Estamos forjando novas mecânicas para o arsenal. Cada atualização
              traz mais um jeito de transformar a sua aula num jogo.
            </p>
            <span class="gcard__meta gcard__meta--soon">
              <app-icon name="rocket" [size]="14" /> Em desenvolvimento
            </span>
          </article>
        </div>
      </div>
    </section>

    <!-- ===== Seção A — Tichr Qlick (o grande diferencial) ===== -->
    <section id="como" class="feature" appReveal>
      <div class="feature__inner container">
        <div class="feature__media">
          <div class="qlick-flow">
            <div class="qk qk--prof">
              <span class="qk__lbl"><app-icon name="user" [size]="13" /> professor</span>
              <p class="qk__q">Qual a capital do Brasil?</p>
              <span class="qk__count">28 alunos respondendo…</span>
            </div>
            <div class="qk qk--aluno">
              <span class="qk__lbl"><app-icon name="user" [size]="13" /> aluno</span>
              <div class="qk__opts">
                <span class="qk__opt qk__opt--a">A</span>
                <span class="qk__opt qk__opt--b">B</span>
                <span class="qk__opt qk__opt--c">C</span>
                <span class="qk__opt qk__opt--d">D</span>
              </div>
            </div>
          </div>
        </div>
        <div class="feature__copy">
          <span class="feature__eyebrow"><app-icon name="game" [size]="15" /> Tichr Qlick</span>
          <h2>Quizzes ao vivo, a sala toda participando</h2>
          <p>
            Crie perguntas e rode uma rodada ao vivo: cada aluno responde pelo
            celular em botões coloridos, o placar sobe na hora e a turma vibra
            junto. Interatividade de verdade, sem instalar nada.
          </p>
          <a class="feature__cta btn-primary" routerLink="/cadastro">Comece grátis agora</a>
        </div>
      </div>
    </section>

    <!-- ===== Seção A-bis — Tichr Wor (batalha de palavras) ===== -->
    <section class="feature feature--invertido feature--wor" appReveal>
      <div class="feature__inner container">
        <div class="feature__media">
          <div class="war">
            <div class="castle">
              <span class="castle__lbl"><app-icon name="castle" [size]="13" /> Equipe 1</span>
              <span class="hp"><span class="hp__fill" style="width: 100%"></span></span>
              <span class="hp__val">1000 / 1000</span>
            </div>
            <span class="war__vs"><app-icon name="sword" [size]="20" /></span>
            <div class="castle castle--hit">
              <span class="castle__lbl"><app-icon name="castle" [size]="13" /> Equipe 2</span>
              <span class="hp"><span class="hp__fill hp__fill--low" style="width: 80%"></span></span>
              <span class="hp__val">800 / 1000</span>
              <span class="castle__dmg">crítico −200</span>
            </div>
          </div>
          <div class="word">
            <span>A</span><span>R</span><span class="word--off">_</span><span class="word--off">_</span>
          </div>
        </div>
        <div class="feature__copy">
          <span class="feature__eyebrow feature__eyebrow--wor"><app-icon name="castle" [size]="15" /> Tichr Wor</span>
          <h2>A revisão da matéria vira uma guerra épica</h2>
          <p>
            Divida a turma em equipes: cada uma defende um castelo. Acertar
            letras carrega o ataque, arriscar a palavra derruba o rival e as
            dicas geradas por IA mantêm todo mundo no jogo. Castelos caem, mas
            ninguém é eliminado — quem perde vira Usurpador e volta pra briga.
          </p>
          <a class="feature__cta btn-wor" routerLink="/cadastro">Forjar sua primeira batalha</a>
        </div>
      </div>
    </section>

    <!-- ===== Seção B — Acesso Frictionless (Smart PIN) ===== -->
    <section class="feature feature--invertido feature--alt" appReveal>
      <div class="feature__inner container">
        <div class="feature__media">
          <div class="pin-flow">
            <div class="pin-card">
              <span class="pin-card__lbl">Sala</span>
              <div class="pin-boxes"><span>1</span><span>2</span></div>
            </div>
            <span class="pin-conn"></span>
            <div class="pin-card pin-card--aluno">
              <span class="pin-card__lbl">Aluno</span>
              <div class="pin-boxes"><span>0</span><span>5</span></div>
            </div>
          </div>
        </div>
        <div class="feature__copy">
          <span class="feature__eyebrow"><app-icon name="lock" [size]="15" /> Acesso sem barreiras</span>
          <h2>O aluno entra em 2 dígitos. Zero conta.</h2>
          <p>
            Sem e-mails, sem senhas esquecidas, sem perder os primeiros minutos da
            aula. O aluno digita o <strong>Smart PIN</strong> da sala e o dele —
            dois dígitos cada. O acesso mais rápido do mercado.
          </p>
        </div>
      </div>
    </section>

    <!-- ===== Seção C — Ranqueamento e Gamificação ===== -->
    <section class="feature" appReveal>
      <div class="feature__inner container">
        <div class="feature__media">
          <article class="demo-card">
            <h3 class="demo-card__tit">Ranking da turma</h3>
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
            <button class="btn-primary demo-card__btn" type="button" (click)="recompensar()">
              {{ recompensado() ? 'Resetar demonstração' : 'Recompensar Duda (+190)' }}
            </button>
          </article>
        </div>
        <div class="feature__copy">
          <span class="feature__eyebrow"><app-icon name="medal" [size]="15" /> Ranking &amp; Hall da Fama</span>
          <h2>O engajamento não morre quando o sinal toca</h2>
          <p>
            Pódios animados, acúmulo de XP e um histórico permanente para celebrar
            os melhores alunos. Ao encerrar a turma, o ranking final vira um mural
            público no Hall da Fama. Toque em "Recompensar" e veja a Duda subir.
          </p>
        </div>
      </div>
    </section>

    <!-- ===== Seção D — Equipes e Papéis (roleplay) ===== -->
    <section class="feature feature--invertido feature--alt" appReveal>
      <div class="feature__inner container">
        <div class="feature__media">
          <div class="squad-card">
            <span class="squad-card__tit"><app-icon name="users" [size]="15" /> Esquadrão Alfa</span>
            <ul class="squad-card__list">
              <li>
                <app-avatar nome="Ana Souza" [size]="36" />
                <span class="mchip"><strong>Ana</strong><small>Líder</small></span>
              </li>
              <li>
                <app-avatar nome="Bruno Lima" [size]="36" />
                <span class="mchip"><strong>Bruno</strong><small>Relator</small></span>
              </li>
              <li>
                <app-avatar nome="Duda Reis" [size]="36" />
                <span class="mchip"><strong>Duda</strong><small>Pesquisa</small></span>
              </li>
            </ul>
          </div>
        </div>
        <div class="feature__copy">
          <span class="feature__eyebrow"><app-icon name="grip" [size]="15" /> Equipes &amp; papéis</span>
          <h2>Organize a turma em esquadrões</h2>
          <p>
            Monte equipes arrastando alunos e atribua papéis específicos —
            líder, relator, pesquisa. Facilite trabalhos em grupo e a gestão
            comportamental, com cada aluno sabendo sua responsabilidade.
          </p>
        </div>
      </div>
    </section>

    <!-- ===== Seção E — Planos de Aula ===== -->
    <section class="feature" appReveal>
      <div class="feature__inner container">
        <div class="feature__media">
          <div class="plan-card">
            <span class="plan-card__tit"><app-icon name="book" [size]="14" /> Matemática · Unidade 2</span>
            <ol class="plan-card__list">
              <li class="is-done"><app-icon name="check" [size]="14" /> Frações</li>
              <li class="is-done"><app-icon name="check" [size]="14" /> Números decimais</li>
              <li class="is-now"><span class="plan-card__dot"></span> Porcentagem <em>hoje</em></li>
              <li class="is-next"><span class="plan-card__dot"></span> Razão e proporção</li>
            </ol>
          </div>
        </div>
        <div class="feature__copy">
          <span class="feature__eyebrow"><app-icon name="book" [size]="15" /> Plano de aula</span>
          <h2>Todo o seu material, organizado num só lugar</h2>
          <p>
            Centralize pautas, tópicos e o andamento do curso. Os jogos são a
            diversão; o Plano de Aula é a sua fundação estruturada — e os tópicos
            acompanham a grade mesmo quando as aulas deslizam.
          </p>
        </div>
      </div>
    </section>

    <!-- ===== Seção F — Agenda Dinâmica (o apoio) ===== -->
    <section class="feature feature--invertido feature--alt" appReveal>
      <div class="feature__inner container">
        <div class="feature__media">
          <div class="demo-card">
            <h3 class="demo-card__tit">Sua agenda</h3>
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
            <button class="btn-primary demo-card__btn" type="button" (click)="toggle()">
              {{ imprevisto() ? 'Resetar demonstração' : 'Surgiu um imprevisto!' }}
            </button>
          </div>
        </div>
        <div class="feature__copy">
          <span class="feature__eyebrow"><app-icon name="calendar" [size]="15" /> Agenda dinâmica</span>
          <h2>A rotina que se readapta sozinha</h2>
          <p>
            A agenda é o apoio silencioso de tudo isso. Um feriado ou uma reunião
            e as aulas deslizam automaticamente, recalculando o fim do curso — sem
            você remexer a grade à mão. Toque e veja acontecer.
          </p>
        </div>
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
                routerLink="/cadastro"
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
            <app-icon name="check" [size]="15" /> Você está na lista de espera. Em breve entramos em contato!
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
    <a class="sticky-cta" routerLink="/cadastro">Começar grátis</a>

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
          <a modal-actions class="btn-primary modal-cta" routerLink="/cadastro">
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

    /* Mockup de celular (Tichr Qlick) */
    .phone { justify-self: center; width: min(300px, 100%); padding: 12px; border-radius: 34px; background: #0b1120; border: 1px solid rgba(148, 163, 184, 0.3); box-shadow: 0 24px 60px rgba(2, 6, 23, 0.55); animation: float 6s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    @media (prefers-reduced-motion: reduce) { .phone { animation: none; } }
    .phone__screen { border-radius: 24px; background: linear-gradient(160deg, #111827, #1e293b); padding: 1.25rem 1.1rem 1.1rem; }
    .phone__tag { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; color: #c4b5fd; }
    .phone__q { margin: 0.75rem 0 1rem; font-size: 1.1rem; font-weight: 700; color: #f8fafc; line-height: 1.25; }
    .phone__opts { display: grid; gap: 0.55rem; }
    .opt { padding: 0.7rem 0.85rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; color: #fff; }
    .opt--a { background: #ef4444; }
    .opt--b { background: #3b82f6; box-shadow: 0 0 0 2px #fff, 0 8px 20px rgba(59, 130, 246, 0.5); transform: scale(1.03); }
    .opt--c { background: #f59e0b; }
    .opt--d { background: #22c55e; }
    .phone__foot { display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; }
    .phone__timer { flex: 1; height: 6px; border-radius: 999px; margin-right: 0.75rem; background: linear-gradient(90deg, #a78bfa 65%, rgba(148,163,184,0.25) 65%); }
    .phone__live { font-size: 0.72rem; font-weight: 700; color: #f87171; }

    /* ===== Padrão de seção (desfile de features) ===== */
    .feature { padding: 4.5rem 0; }
    .feature--alt { background: var(--surface-alt); }
    .feature__inner { display: grid; grid-template-columns: 1fr; gap: 2rem; align-items: center; }
    @media (min-width: 860px) {
      .feature__inner { grid-template-columns: 1fr 1fr; gap: 3.5rem; }
      .feature--invertido .feature__media { order: 2; }
    }
    .feature__eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--primary); margin-bottom: 0.6rem; }
    .feature__copy h2 { margin: 0 0 0.75rem; }
    .feature__copy p { margin: 0; color: var(--text-muted); font-size: 1.08rem; line-height: 1.6; }
    .feature__cta { display: inline-flex; margin-top: 1.5rem; text-decoration: none; }
    .feature__media { display: flex; justify-content: center; }

    /* Seção A — fluxo do Qlick */
    .qlick-flow { display: grid; gap: 1rem; width: min(360px, 100%); }
    .qk { border: 1px solid var(--border); border-radius: 16px; background: var(--surface); padding: 1.1rem 1.2rem; box-shadow: 4px 4px 0 color-mix(in srgb, var(--primary) 18%, transparent); }
    .qk__lbl { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; color: var(--text-muted); }
    .qk__q { margin: 0.5rem 0 0.4rem; font-size: 1.05rem; font-weight: 700; }
    .qk__count { font-size: 0.82rem; color: var(--primary); font-weight: 600; }
    .qk__opts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 0.6rem; }
    .qk__opt { display: flex; align-items: center; justify-content: center; height: 46px; border-radius: 12px; font-weight: 800; color: #fff; }
    .qk__opt--a { background: #ef4444; }
    .qk__opt--b { background: #3b82f6; }
    .qk__opt--c { background: #f59e0b; }
    .qk__opt--d { background: #22c55e; }

    /* Seção B — Smart PIN */
    .pin-flow { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
    .pin-card { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 1.1rem 1rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: 4px 4px 0 rgba(15, 23, 42, 0.08); }
    .pin-card__lbl { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; color: var(--text-muted); }
    .pin-boxes { display: flex; gap: 0.4rem; }
    .pin-boxes span { display: flex; align-items: center; justify-content: center; width: 40px; height: 52px; border-radius: 10px; font-size: 1.6rem; font-weight: 800; color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, var(--surface)); border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); }
    .pin-card--aluno .pin-boxes span { color: var(--success, #16a34a); background: color-mix(in srgb, var(--success, #16a34a) 12%, var(--surface)); border-color: color-mix(in srgb, var(--success, #16a34a) 30%, transparent); }
    .pin-conn { width: 34px; height: 3px; border-radius: 999px; background: repeating-linear-gradient(90deg, var(--primary) 0 7px, transparent 7px 12px); }

    /* Cartão de demo (ranking/deslizamento) dentro das seções */
    .demo-card { width: min(380px, 100%); padding: 1.4rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: 6px 6px 0 color-mix(in srgb, var(--primary) 12%, transparent); }
    .demo-card__tit { margin: 0 0 1rem; font-size: 1.1rem; }
    .demo-card__btn { margin-top: 1.25rem; cursor: pointer; }

    /* Seção D — card flutuante de equipe (flat: sombra dura branca) */
    .squad-card { width: min(320px, 100%); padding: 1.25rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: 8px 8px 0 var(--surface-alt), 8px 8px 0 1px var(--border); }
    .squad-card__tit { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 800; color: var(--primary); margin-bottom: 0.9rem; }
    .squad-card__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .squad-card__list li { display: flex; align-items: center; gap: 0.7rem; padding: 0.4rem; border-radius: 12px; background: var(--surface-alt); }
    .mchip { display: flex; flex-direction: column; line-height: 1.15; }
    .mchip strong { font-size: 0.95rem; }
    .mchip small { font-size: 0.75rem; color: var(--primary); font-weight: 700; }

    /* Seção E — pauta do plano de aula */
    .plan-card { width: min(340px, 100%); padding: 1.25rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: 6px 6px 0 color-mix(in srgb, var(--primary) 12%, transparent); }
    .plan-card__tit { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 800; color: var(--primary); margin-bottom: 0.9rem; }
    .plan-card__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .plan-card__list li { display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 0.75rem; border-radius: 10px; background: var(--surface-alt); font-size: 0.95rem; font-weight: 600; }
    .plan-card__list .is-done { color: var(--text-muted); }
    .plan-card__list .is-done app-icon { color: var(--success, #16a34a); }
    .plan-card__list .is-now { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
    .plan-card__list .is-now em { margin-left: auto; font-style: normal; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .plan-card__dot { width: 9px; height: 9px; border-radius: 999px; background: currentColor; }
    .plan-card__list .is-next { color: var(--text-muted); }

    /* Demo de deslizamento da agenda (Seção F) */
    .demo { max-width: 380px; margin: 0 auto 1.25rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 0.5rem; text-align: left; }
    .aula { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 0.9rem; border-radius: var(--radius); transition: background-color 0.45s ease, transform 0.45s ease; }
    .aula + .aula { margin-top: 0.25rem; }
    .aula--shift { background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .aula__n { font-weight: 600; }
    .aula__d { color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .excecao { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; padding: 0.65rem 0.9rem; font-weight: 600; color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, transparent); border-radius: var(--radius); }
    /* Ranking da turma (Seção C) */
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

    /* ===== Arena de jogos ===== */
    .arena { padding: 4.5rem 0; text-align: center; }
    .arena__eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--primary); margin-bottom: 0.6rem; }
    .arena__lead { max-width: 40rem; margin: 0 auto 2.5rem; color: var(--text-muted); font-size: 1.08rem; line-height: 1.6; }
    .arena__grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; text-align: left; }
    @media (min-width: 820px) { .arena__grid { grid-template-columns: repeat(3, 1fr); } }
    .gcard { display: flex; flex-direction: column; gap: 0.55rem; padding: 1.6rem 1.4rem; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); border-top: 3px solid var(--border); transition: transform 0.15s ease, box-shadow 0.2s ease; }
    .gcard:hover { transform: translateY(-4px); }
    .gcard__ic { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px; }
    .gcard__tag { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    .gcard__nome { margin: 0; font-size: 1.3rem; font-weight: 800; letter-spacing: -0.01em; }
    .gcard__desc { margin: 0; color: var(--text-muted); font-size: 0.98rem; line-height: 1.55; flex: 1; }
    .gcard__meta { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.4rem; font-size: 0.82rem; font-weight: 700; }
    /* Qlick — azul/primário */
    .gcard--qlick { border-top-color: var(--primary); }
    .gcard--qlick:hover { box-shadow: 0 16px 40px color-mix(in srgb, var(--primary) 22%, transparent); }
    .gcard--qlick .gcard__ic { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .gcard--qlick .gcard__tag { color: var(--primary); }
    /* Wor — âmbar */
    .gcard--wor { border-top-color: #b45309; }
    .gcard--wor:hover { box-shadow: 0 16px 40px color-mix(in srgb, #b45309 26%, transparent); }
    .gcard--wor .gcard__ic { color: #b45309; background: color-mix(in srgb, #b45309 14%, transparent); }
    .gcard--wor .gcard__tag { color: #b45309; }
    .gcard__meta--phd { color: #b45309; }
    /* Em breve — apagado/tracejado */
    .gcard--soon { border-style: dashed; border-top-style: solid; border-top-color: color-mix(in srgb, var(--text-muted) 50%, transparent); background: color-mix(in srgb, var(--surface-alt) 60%, var(--surface)); }
    .gcard--soon .gcard__ic { color: var(--text-muted); background: color-mix(in srgb, var(--text-muted) 12%, transparent); }
    .gcard--soon .gcard__tag { color: var(--text-muted); }
    .gcard__meta--soon { color: var(--text-muted); }

    /* Seção deep-dive do Wor — fundo âmbar próprio + mockup de batalha */
    .feature--wor { background: color-mix(in srgb, #b45309 7%, var(--surface)); }
    .feature__eyebrow--wor { color: #b45309; }
    .btn-wor { display: inline-flex; align-items: center; justify-content: center; margin-top: 1.5rem; padding: 0.8rem 1.6rem; font-weight: 800; color: #fff; text-decoration: none; border-radius: var(--radius); background: linear-gradient(135deg, #b45309, #7c2d12); box-shadow: 0 10px 30px color-mix(in srgb, #b45309 40%, transparent); transition: transform 0.15s ease; }
    .btn-wor:hover { transform: translateY(-2px); }
    .war { display: flex; align-items: stretch; justify-content: center; gap: 0.75rem; width: min(400px, 100%); }
    .castle { flex: 1; display: flex; flex-direction: column; gap: 0.45rem; padding: 1rem 1.1rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: 4px 4px 0 color-mix(in srgb, #b45309 18%, transparent); }
    .castle__lbl { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #b45309; }
    .hp { display: block; height: 9px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .hp__fill { display: block; height: 100%; border-radius: 999px; background: #22c55e; }
    .hp__fill--low { background: #f59e0b; }
    .hp__val { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .castle--hit { animation: shake 0.5s ease; }
    .castle__dmg { align-self: flex-start; font-size: 0.75rem; font-weight: 800; color: #fff; padding: 0.15rem 0.5rem; border-radius: 999px; background: #ef4444; }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
    @media (prefers-reduced-motion: reduce) { .castle--hit { animation: none; } }
    .war__vs { display: flex; align-items: center; color: #b45309; }
    .word { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1.1rem; }
    .word span { display: flex; align-items: center; justify-content: center; width: 42px; height: 50px; border-radius: 10px; font-size: 1.5rem; font-weight: 800; color: #fff; background: linear-gradient(135deg, #b45309, #7c2d12); }
    .word span.word--off { color: color-mix(in srgb, #b45309 55%, transparent); background: color-mix(in srgb, #b45309 12%, var(--surface)); border: 1px solid color-mix(in srgb, #b45309 30%, transparent); }

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

  protected readonly faqs: ReadonlyArray<{ q: string; a: string }> = [
    {
      q: 'Quais jogos o Tichr tem?',
      a: 'Hoje são dois: o Tichr Qlick (quiz ao vivo) e o Tichr Wor (batalha de palavras em equipes) — ambos, como toda a gamificação, fazem parte do plano PhD. Você pode conhecer tudo nos planos gratuitos e desbloquear quando quiser. Novas mecânicas estão em desenvolvimento e chegam ao arsenal nas próximas atualizações.',
    },
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
