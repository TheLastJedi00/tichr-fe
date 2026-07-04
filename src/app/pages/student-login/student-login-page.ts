import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentAuthService } from '../../core/student-auth.service';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Tela pública de login do aluno (/t/:turmaId): saudação da turma, seleção do
 * próprio nome e teclado numérico para o PIN (2 díg Smart / 4 díg legado).
 */
@Component({
  selector: 'app-student-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Spinner],
  template: `
    <div class="wrap">
      <div class="card">
        <span class="marca">Tichr</span>

        @if (carregando()) {
          <div class="loading"><app-spinner [size]="28" /></div>
        } @else {
          <h1 class="ola">Olá! Bem-vindo à turma</h1>
          <p class="turma">{{ turmaNome() }}</p>

          <label class="campo">
            <span>Quem é você?</span>
            <select
              class="tichr-input"
              [value]="alunoId()"
              (change)="alunoId.set($any($event.target).value)"
            >
              <option value="">Selecione seu nome</option>
              @for (a of alunos(); track a.id) {
                <option [value]="a.id">{{ a.nome }}</option>
              }
            </select>
          </label>

          <div class="pin">
            @for (i of slots(); track i) {
              <span class="pin__dot" [class.pin__dot--on]="pin().length > i"></span>
            }
          </div>

          <div class="keypad">
            @for (t of teclas; track t) {
              @if (t === 'del') {
                <button class="key key--del" type="button" (click)="apagar()">
                  <app-icon name="close" [size]="20" />
                </button>
              } @else if (t === '') {
                <span class="key key--vazio"></span>
              } @else {
                <button class="key" type="button" (click)="digitar(t)">{{ t }}</button>
              }
            }
          </div>

          @if (erro()) {
            <p class="erro">{{ erro() }}</p>
          }

          <button
            class="btn-primary entrar"
            type="button"
            [disabled]="!podeEntrar() || entrando()"
            (click)="entrar()"
          >
            Entrar
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: linear-gradient(130deg, #0b1120, #1e3a8a); }
    .wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.25rem; }
    .card {
      width: min(360px, 100%);
      background: var(--surface);
      border-radius: 20px;
      padding: 1.75rem 1.5rem 2rem;
      text-align: center;
      box-shadow: 0 24px 60px rgba(2, 6, 23, 0.4);
    }
    .marca { font-weight: 800; color: var(--primary); }
    .loading { display: flex; justify-content: center; padding: 2rem 0; color: var(--primary); }
    .ola { margin: 1rem 0 0.25rem; font-size: 1.1rem; font-weight: 600; color: var(--text-muted); }
    .turma { margin: 0 0 1.25rem; font-size: 1.5rem; font-weight: 800; }
    .campo { display: block; text-align: left; margin-bottom: 1.25rem; }
    .campo span { display: block; font-weight: 600; margin-bottom: 0.35rem; font-size: 0.9rem; }
    .pin { display: flex; justify-content: center; gap: 0.75rem; margin-bottom: 1.25rem; }
    .pin__dot {
      width: 14px; height: 14px; border-radius: 999px;
      border: 2px solid var(--border);
    }
    .pin__dot--on { background: var(--primary); border-color: var(--primary); }
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }
    .key {
      font: inherit;
      font-size: 1.35rem;
      font-weight: 700;
      padding: 0.75rem 0;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface-alt);
      color: var(--text);
      cursor: pointer;
    }
    .key:active { background: color-mix(in srgb, var(--primary) 15%, var(--surface-alt)); }
    .key--del { display: inline-flex; align-items: center; justify-content: center; color: var(--danger); }
    .key--vazio { border: none; background: none; cursor: default; }
    .erro { color: var(--danger); font-weight: 600; margin: 0 0 0.75rem; }
    .entrar { width: 100%; }
  `,
})
export class StudentLoginPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentAuth = inject(StudentAuthService);

  protected readonly turmaId = this.route.snapshot.paramMap.get('turmaId')!;
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  protected readonly carregando = signal(true);
  protected readonly turmaNome = signal('');
  protected readonly alunos = signal<Array<{ id: string; nome: string }>>([]);
  protected readonly alunoId = signal('');
  protected readonly pin = signal('');
  protected readonly entrando = signal(false);
  protected readonly erro = signal('');
  // Smart PINs: nº de dígitos do PIN do aluno (2 migrado / 4 legado).
  protected readonly pinLen = signal(4);
  protected readonly slots = computed(() =>
    Array.from({ length: this.pinLen() }, (_, i) => i),
  );

  protected readonly podeEntrar = computed(
    () => this.pin().length === this.pinLen() && this.alunoId().length > 0,
  );

  constructor() {
    this.studentAuth.infoTurma(this.turmaId).subscribe({
      next: (info) => {
        this.turmaNome.set(info.turmaNome);
        this.alunos.set(info.alunos);
        this.pinLen.set(info.pinAlunoLength ?? 4);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Turma não encontrada.');
        this.carregando.set(false);
      },
    });
  }

  protected digitar(d: string): void {
    if (this.pin().length < this.pinLen()) {
      this.pin.update((p) => p + d);
      this.erro.set('');
    }
  }

  protected apagar(): void {
    this.pin.update((p) => p.slice(0, -1));
  }

  protected entrar(): void {
    if (!this.podeEntrar()) {
      return;
    }
    this.entrando.set(true);
    this.erro.set('');
    this.studentAuth.login(this.turmaId, this.pin()).subscribe({
      next: () => this.router.navigateByUrl('/aluno/dashboard'),
      error: () => {
        this.entrando.set(false);
        this.pin.set('');
        this.erro.set('PIN incorreto. Tente de novo.');
      },
    });
  }
}
