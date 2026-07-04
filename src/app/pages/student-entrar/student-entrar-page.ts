import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { PortalProfessor, PortalTurma } from '../../core/models';
import { StudentAuthService } from '../../core/student-auth.service';
import { Avatar } from '../../ui/avatar/avatar';
import { Icon } from '../../ui/icon/icon';

type Etapa = 'busca' | 'turmas' | 'pinTurma' | 'nome' | 'pinAluno';

/**
 * Jornada pública de acesso do aluno (/entrar), em etapas:
 * @username do professor → turma → PIN da turma (6 díg) → nome → PIN (4 díg).
 */
@Component({
  selector: 'app-student-entrar-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgTemplateOutlet, Avatar],
  template: `
    <div class="wrap">
      <div class="card">
        <span class="marca">Tichr</span>

        @switch (etapa()) {
          @case ('busca') {
            <h1 class="tit">Entrar como aluno</h1>
            <p class="sub">Digite o @usuário do seu professor.</p>
            <label class="campo">
              <span>Usuário do professor</span>
              <input
                class="tichr-input"
                placeholder="@prof.marina"
                [value]="username()"
                (input)="username.set($any($event.target).value)"
                (keydown.enter)="buscar()"
              />
            </label>
            <button
              class="btn-primary full"
              type="button"
              [disabled]="username().trim().length < 3 || carregando()"
              (click)="buscar()"
            >
              {{ carregando() ? 'Buscando…' : 'Buscar' }}
            </button>
          }

          @case ('turmas') {
            <div class="prof">
              <app-avatar [nome]="professor()?.nome" [url]="professor()?.avatarUrl" [size]="72" />
              <strong class="prof__nome">{{ professor()?.nome || ('@' + usernameLimpo()) }}</strong>
              <span class="prof__user">&#64;{{ professor()?.username || usernameLimpo() }}</span>
            </div>
            <h1 class="tit">Escolha sua turma</h1>
            <div class="turmas">
              @for (t of turmas(); track t.turmaId) {
                <button class="turma" type="button" (click)="escolherTurma(t)">
                  @if (t.cor) { <span class="dot" [style.background]="t.cor"></span> }
                  {{ t.nome }}
                </button>
              } @empty {
                <p class="sub">Nenhuma turma ativa encontrada.</p>
              }
            </div>
            <button class="btn-outline full" type="button" (click)="voltar('busca')">
              Voltar
            </button>
          }

          @case ('pinTurma') {
            <h1 class="tit">PIN da turma</h1>
            <p class="sub">{{ turmaSel()?.nome }} · {{ pinLenTurma() }} dígitos do professor</p>
            <div class="pin">
              @for (i of slots(); track i) {
                <span class="pin__dot" [class.pin__dot--on]="pin().length > i"></span>
              }
            </div>
            <ng-container [ngTemplateOutlet]="keypad" />
            @if (erro()) { <p class="erro">{{ erro() }}</p> }
            <button
              class="btn-primary full"
              type="button"
              [disabled]="pin().length !== pinLenTurma() || carregando()"
              (click)="validarPinTurma()"
            >
              {{ carregando() ? 'Validando…' : 'Continuar' }}
            </button>
            <button class="btn-outline full mt" type="button" (click)="voltar('turmas')">
              Voltar
            </button>
          }

          @case ('nome') {
            <h1 class="tit">Quem é você?</h1>
            <p class="sub">{{ turmaSel()?.nome }}</p>
            <label class="campo">
              <span>Selecione seu nome</span>
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
            <button
              class="btn-primary full"
              type="button"
              [disabled]="!alunoId()"
              (click)="irParaPinAluno()"
            >
              Continuar
            </button>
          }

          @case ('pinAluno') {
            <h1 class="tit">Seu PIN</h1>
            <p class="sub">{{ pinLenAluno() }} dígitos pessoais</p>
            <div class="pin">
              @for (i of slots(); track i) {
                <span class="pin__dot" [class.pin__dot--on]="pin().length > i"></span>
              }
            </div>
            <ng-container [ngTemplateOutlet]="keypad" />
            @if (erro()) { <p class="erro">{{ erro() }}</p> }
            <button
              class="btn-primary full"
              type="button"
              [disabled]="pin().length !== pinLenAluno() || entrando()"
              (click)="entrar()"
            >
              {{ entrando() ? 'Entrando…' : 'Entrar' }}
            </button>
            <button class="btn-outline full mt" type="button" (click)="voltar('nome')">
              Voltar
            </button>
          }
        }
      </div>
    </div>

    <ng-template #keypad>
      <div class="keypad">
        @for (t of teclas; track $index) {
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
    </ng-template>
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
    .tit { margin: 1rem 0 0.25rem; font-size: 1.4rem; font-weight: 800; }
    .sub { margin: 0 0 1.25rem; color: var(--text-muted); font-size: 0.9rem; }
    .campo { display: block; text-align: left; margin-bottom: 1rem; }
    .campo span { display: block; font-weight: 600; margin-bottom: 0.35rem; font-size: 0.9rem; }
    .full { width: 100%; }
    .mt { margin-top: 0.5rem; }
    .prof { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; margin-top: 0.5rem; }
    .prof__nome { font-size: 1.05rem; font-weight: 800; }
    .prof__user { color: var(--text-muted); font-size: 0.85rem; font-weight: 600; }
    .turmas { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .turma {
      display: flex; align-items: center; gap: 0.5rem;
      font: inherit; font-weight: 600; text-align: left;
      padding: 0.8rem 1rem; border-radius: 14px;
      border: 1px solid var(--border); background: var(--surface-alt);
      color: var(--text); cursor: pointer;
    }
    .dot { width: 12px; height: 12px; border-radius: 999px; }
    .pin { display: flex; justify-content: center; gap: 0.6rem; margin-bottom: 1.25rem; }
    .pin__dot { width: 13px; height: 13px; border-radius: 999px; border: 2px solid var(--border); }
    .pin__dot--on { background: var(--primary); border-color: var(--primary); }
    .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; margin-bottom: 1.25rem; }
    .key {
      font: inherit; font-size: 1.35rem; font-weight: 700; padding: 0.7rem 0;
      border-radius: 14px; border: 1px solid var(--border);
      background: var(--surface-alt); color: var(--text); cursor: pointer;
    }
    .key:active { background: color-mix(in srgb, var(--primary) 15%, var(--surface-alt)); }
    .key--del { display: inline-flex; align-items: center; justify-content: center; color: var(--danger); }
    .key--vazio { border: none; background: none; cursor: default; }
    .erro { color: var(--danger); font-weight: 600; margin: 0 0 0.75rem; }
  `,
})
export class StudentEntrarPage {
  private readonly router = inject(Router);
  private readonly studentAuth = inject(StudentAuthService);

  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  // Smart PINs: o nº de slots vem do backend (2 díg migrado / 6-4 díg legado).
  protected readonly pinLenTurma = signal(6);
  protected readonly pinLenAluno = signal(4);
  protected readonly slots = computed(() =>
    Array.from({ length: this.tamanhoPin() }, (_, i) => i),
  );

  protected readonly etapa = signal<Etapa>('busca');
  protected readonly username = signal('');
  protected readonly professor = signal<PortalProfessor | null>(null);
  protected readonly turmas = signal<PortalTurma[]>([]);
  protected readonly turmaSel = signal<PortalTurma | null>(null);
  protected readonly alunos = signal<Array<{ id: string; nome: string }>>([]);
  protected readonly alunoId = signal('');
  protected readonly pin = signal('');
  protected readonly carregando = signal(false);
  protected readonly entrando = signal(false);
  protected readonly erro = signal('');

  protected readonly usernameLimpo = computed(() =>
    this.username().trim().replace(/^@/, ''),
  );

  private tamanhoPin(): number {
    return this.etapa() === 'pinTurma' ? this.pinLenTurma() : this.pinLenAluno();
  }

  protected digitar(d: string): void {
    if (this.pin().length < this.tamanhoPin()) {
      this.pin.update((p) => p + d);
      this.erro.set('');
    }
  }

  protected apagar(): void {
    this.pin.update((p) => p.slice(0, -1));
  }

  protected buscar(): void {
    if (this.username().trim().length < 3) {
      return;
    }
    this.carregando.set(true);
    this.erro.set('');
    this.studentAuth.buscarTurmas(this.username()).subscribe({
      next: (res) => {
        this.professor.set(res.professor);
        this.turmas.set(res.turmas);
        this.carregando.set(false);
        this.etapa.set('turmas');
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Professor não encontrado.');
      },
    });
  }

  protected escolherTurma(t: PortalTurma): void {
    this.turmaSel.set(t);
    this.pinLenTurma.set(t.pinLength ?? 6);
    this.pin.set('');
    this.erro.set('');
    this.etapa.set('pinTurma');
  }

  protected validarPinTurma(): void {
    const turma = this.turmaSel();
    if (!turma || this.pin().length !== this.pinLenTurma()) {
      return;
    }
    this.carregando.set(true);
    this.erro.set('');
    this.studentAuth.desbloquearTurma(turma.turmaId, this.pin()).subscribe({
      next: (info) => {
        this.alunos.set(info.alunos);
        this.pinLenAluno.set(info.pinAlunoLength ?? 4);
        this.carregando.set(false);
        this.pin.set('');
        this.etapa.set('nome');
      },
      error: () => {
        this.carregando.set(false);
        this.pin.set('');
        this.erro.set('PIN da turma inválido.');
      },
    });
  }

  protected irParaPinAluno(): void {
    if (!this.alunoId()) {
      return;
    }
    this.pin.set('');
    this.erro.set('');
    this.etapa.set('pinAluno');
  }

  protected entrar(): void {
    const turma = this.turmaSel();
    if (!turma || this.pin().length !== this.pinLenAluno()) {
      return;
    }
    this.entrando.set(true);
    this.erro.set('');
    this.studentAuth.login(turma.turmaId, this.pin()).subscribe({
      next: () => this.router.navigateByUrl('/aluno/dashboard'),
      error: () => {
        this.entrando.set(false);
        this.pin.set('');
        this.erro.set('PIN incorreto. Tente de novo.');
      },
    });
  }

  protected voltar(etapa: Etapa): void {
    this.pin.set('');
    this.erro.set('');
    this.etapa.set(etapa);
  }
}
