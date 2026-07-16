import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { POLITICA_PRIVACIDADE, TERMOS_DE_USO } from '../../core/legal.data';
import { PlanoAtual } from '../../core/models';
import { Plano, PLANOS } from '../../core/planos.data';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { LegalDoc } from '../../ui/legal-doc/legal-doc';
import { Logo } from '../../ui/logo/logo';
import { Modal } from '../../ui/modal/modal';

/**
 * Cadastro: formulário reativo com Nome, E-mail e Senha, card do plano escolhido
 * (trocável por modal), cupom (oculto no plano gratuito) e aceite obrigatório dos
 * Termos de Uso e da Política de Privacidade (abertos em modais). O botão "Criar
 * Conta" só libera com o formulário válido e ambos os aceites marcados.
 */
@Component({
  selector: 'app-cadastro-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, Modal, LegalDoc, Logo],
  template: `
    <div class="wrap">
      <a class="voltar" routerLink="/">← Voltar ao site</a>
      <app-logo class="logo" [size]="40" />
      <app-card title="Criar conta">
        <p class="sub">Comece agora. Só precisamos do essencial.</p>

        <!-- Card do plano escolhido (confirmação visual + troca rápida) -->
        <div class="plano">
          <div class="plano__info">
            <span class="plano__nome">{{ planoInfo().nome }}</span>
            <span class="plano__preco">
              {{ planoInfo().preco }}<small>{{ planoInfo().periodo }}</small>
            </span>
            <span class="plano__limite">{{ planoInfo().limite }}</span>
          </div>
          <button type="button" class="btn-outline plano__trocar" (click)="trocaAberta.set(true)">
            Trocar
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="criar()">
          <label class="campo">
            <span>Nome</span>
            <input class="tichr-input" formControlName="nome" autocomplete="name" placeholder="Seu nome" />
          </label>
          <label class="campo">
            <span>E-mail</span>
            <input class="tichr-input" type="email" formControlName="email" autocomplete="email" />
          </label>
          <label class="campo">
            <span>Senha</span>
            <input class="tichr-input" type="password" formControlName="senha" autocomplete="new-password" />
          </label>

          @if (!ehGratuito()) {
            <label class="campo">
              <span>Cupom <small>(opcional)</small></span>
              <input
                class="tichr-input cupom"
                type="text"
                formControlName="cupom"
                autocomplete="off"
                placeholder="Tem um código de desconto?"
                (input)="uppercaseCupom($event)"
              />
            </label>
          }

          <!-- Aceite jurídico (LGPD): trava o envio -->
          <div class="aceites">
            <label class="aceite">
              <input type="checkbox" formControlName="aceiteTermos" />
              <span>
                Li e concordo com os
                <button type="button" class="link" (click)="termosAberto.set(true)">Termos de Uso</button>
              </span>
            </label>
            <label class="aceite">
              <input type="checkbox" formControlName="aceitePrivacidade" />
              <span>
                Li e concordo com a
                <button type="button" class="link" (click)="privacidadeAberto.set(true)">Política de Privacidade</button>
              </span>
            </label>
          </div>

          @if (erro()) {
            <p class="error">{{ erro() }}</p>
          }

          <button class="btn-primary full" type="submit" [disabled]="criando() || form.invalid">
            {{ criando() ? 'Criando…' : 'Criar Conta' }}
          </button>
        </form>
      </app-card>

      <a class="entrar" routerLink="/login">Já tenho conta — Entrar</a>
    </div>

    <!-- Modal: troca de plano -->
    <app-modal [open]="trocaAberta()" title="Escolha seu plano" (close)="trocaAberta.set(false)">
      <ul class="planos">
        @for (p of planos; track p.plano) {
          <li>
            <button
              type="button"
              class="planos__op"
              [class.is-on]="p.plano === planoSelecionado()"
              (click)="selecionarPlano(p.plano)"
            >
              <span class="planos__nome">{{ p.nome }}</span>
              <span class="planos__preco">{{ p.preco }}<small>{{ p.periodo }}</small></span>
            </button>
          </li>
        }
      </ul>
    </app-modal>

    <!-- Modais dos documentos legais -->
    <app-modal [open]="termosAberto()" (close)="termosAberto.set(false)">
      <div class="doc-scroll"><app-legal-doc [doc]="termos" /></div>
      <button modal-actions class="btn-primary" type="button" (click)="termosAberto.set(false)">Fechar</button>
    </app-modal>
    <app-modal [open]="privacidadeAberto()" (close)="privacidadeAberto.set(false)">
      <div class="doc-scroll"><app-legal-doc [doc]="privacidade" /></div>
      <button modal-actions class="btn-primary" type="button" (click)="privacidadeAberto.set(false)">Fechar</button>
    </app-modal>
  `,
  styles: `
    .wrap { max-width: 380px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    .voltar { display: inline-block; margin-bottom: 1.25rem; font-weight: 600; color: var(--text-muted); }
    .logo { display: flex; justify-content: center; margin-bottom: 1.25rem; }
    .sub { margin: 0 0 1rem; color: var(--text-muted); font-size: 0.9rem; }
    .plano { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; padding: 0.75rem 0.9rem; border: 1px solid var(--primary); border-radius: var(--radius); background: color-mix(in srgb, var(--primary) 6%, var(--surface)); }
    .plano__info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
    .plano__nome { font-weight: 800; }
    .plano__preco { font-weight: 700; color: var(--primary); }
    .plano__preco small { font-weight: 500; color: var(--text-muted); }
    .plano__limite { font-size: 0.8rem; color: var(--text-muted); }
    .plano__trocar { flex: 0 0 auto; padding: 0.4rem 0.8rem; font-size: 0.85rem; }
    .campo { display: block; margin-bottom: 1rem; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .campo > span small { font-weight: 500; opacity: 0.8; }
    .cupom { text-transform: uppercase; letter-spacing: 0.05em; }
    .aceites { display: flex; flex-direction: column; gap: 0.6rem; margin: 0.5rem 0 1.25rem; }
    .aceite { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.9rem; line-height: 1.4; }
    .aceite input { width: 18px; height: 18px; margin-top: 0.1rem; flex: 0 0 auto; }
    .link { font: inherit; font-weight: 700; color: var(--primary); background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline; }
    .full { width: 100%; }
    .error { color: var(--danger); margin: 0 0 0.75rem; }
    .entrar { display: block; text-align: center; margin-top: 1rem; font-weight: 600; color: var(--primary); }
    .planos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .planos__op { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0.9rem; font: inherit; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; }
    .planos__op.is-on { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--surface)); }
    .planos__nome { font-weight: 700; }
    .planos__preco { font-weight: 700; color: var(--primary); }
    .planos__preco small { font-weight: 500; color: var(--text-muted); }
    .doc-scroll { max-height: 60vh; overflow-y: auto; }
  `,
})
export class CadastroPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly planos = PLANOS;
  protected readonly termos = TERMOS_DE_USO;
  protected readonly privacidade = POLITICA_PRIVACIDADE;

  protected readonly criando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly trocaAberta = signal(false);
  protected readonly termosAberto = signal(false);
  protected readonly privacidadeAberto = signal(false);

  protected readonly planoSelecionado = signal<PlanoAtual>(this.planoInicial());
  protected readonly planoInfo = computed(
    () => PLANOS.find((p) => p.plano === this.planoSelecionado()) ?? PLANOS[0],
  );
  protected readonly ehGratuito = computed(
    () => this.planoSelecionado() === 'ESTAGIARIO',
  );

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    cupom: [''],
    aceiteTermos: [false, Validators.requiredTrue],
    aceitePrivacidade: [false, Validators.requiredTrue],
  });

  /** Lê o plano escolhido na landing (`?plano=`); default Estagiário. */
  private planoInicial(): PlanoAtual {
    const q = (this.route.snapshot.queryParamMap.get('plano') ?? '').toUpperCase();
    return PLANOS.some((p) => p.plano === q) ? (q as PlanoAtual) : 'ESTAGIARIO';
  }

  protected selecionarPlano(plano: PlanoAtual): void {
    this.planoSelecionado.set(plano);
    if (plano === 'ESTAGIARIO') this.form.controls.cupom.setValue('');
    this.trocaAberta.set(false);
  }

  protected uppercaseCupom(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    this.form.controls.cupom.setValue(el.value.toUpperCase());
  }

  protected criar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.criando.set(true);
    this.erro.set(null);
    this.auth
      .signup({
        nome: raw.nome.trim(),
        email: raw.email.trim(),
        password: raw.senha,
        aceiteTermos: raw.aceiteTermos,
        aceitePrivacidade: raw.aceitePrivacidade,
      })
      .subscribe({
        next: () => this.posSignup(),
        error: (e: HttpErrorResponse) => {
          this.erro.set(
            e.status === 409
              ? 'Esse e-mail já está cadastrado.'
              : 'Não foi possível criar a conta. Tente novamente.',
          );
          this.criando.set(false);
        },
      });
  }

  /**
   * Conta criada e autenticada. Aplica o cupom (se houver) ou faz o upgrade do
   * plano escolhido (planos pagos), e segue para a confirmação de e-mail — a
   * conta nasce sem e-mail confirmado e o painel fica travado até o clique no
   * link. Nem o cupom nem o upgrade bloqueiam a navegação: o professor pode
   * ajustar depois em "Meu Plano".
   */
  private posSignup(): void {
    const ir = () => this.router.navigateByUrl('/verificar-email');
    const cupom = this.form.controls.cupom.value.trim();
    const plano = this.planoSelecionado();
    if (!this.ehGratuito() && cupom) {
      this.profile.aplicarCupom(cupom).subscribe({ next: ir, error: ir });
      return;
    }
    if (plano !== 'ESTAGIARIO') {
      this.profile.upgradePlano(plano).subscribe({ next: ir, error: ir });
      return;
    }
    ir();
  }
}
