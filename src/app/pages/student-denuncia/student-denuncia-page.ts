import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import {
  DenunciaAluno,
  DenunciaApiService,
  OpcoesDenuncia,
  StatusDenuncia,
} from '../../core/denuncia-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

const STATUS_ROTULO: Record<StatusDenuncia, string> = {
  PENDENTE: 'Aguardando o professor',
  VALIDADA: 'Aceita pelo professor',
  INVALIDADA: 'Não aceita',
};

/**
 * Denúncia entre alunos (spec 032), no portal do aluno: escolhe o colega, um
 * tópico do professor e/ou escreve o que aconteceu. Só o professor vê quem
 * denunciou. Spec 033: sem foto, e só com a janela aberta pelo professor.
 */
@Component({
  selector: 'app-student-denuncia-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Card, Icon, Spinner],
  template: `
    <a class="voltar" routerLink="/aluno/dashboard">← Início</a>
    <h1 class="titulo"><app-icon name="flag" [size]="22" /> Denunciar</h1>
    <p class="sub">Só o professor vê quem fez a denúncia.</p>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (opcoes(); as op) {
      <app-card>
        @if (!op.abertas) {
          <div class="fechadas" role="status">
            <app-icon name="lock" [size]="22" />
            <div>
              <strong>As denúncias estão fechadas.</strong>
              <span>O professor abre durante a aula.</span>
            </div>
          </div>
        } @else if (enviada()) {
          <div class="ok" role="status">
            <app-icon name="check" [size]="22" />
            <div>
              <strong>Denúncia enviada.</strong>
              <span>O professor vai analisar e decidir.</span>
            </div>
          </div>
          <button type="button" class="btn-outline" (click)="nova()">Fazer outra denúncia</button>
        } @else {
          <form class="form" (ngSubmit)="enviar()">
            <label class="campo">
              <span class="campo__lbl">Quem você quer denunciar?</span>
              <select
                class="tichr-input"
                name="colega"
                [ngModel]="colegaId()"
                (ngModelChange)="colegaId.set($event)"
              >
                <option value="">Escolha um colega</option>
                @for (c of op.colegas; track c.id) {
                  <option [value]="c.id">{{ c.nome }}</option>
                }
              </select>
            </label>

            @if (op.topicos.length) {
              <div class="campo">
                <span class="campo__lbl">O que aconteceu?</span>
                <div class="topicos">
                  @for (t of op.topicos; track t.id) {
                    <button
                      type="button"
                      class="topico"
                      [class.topico--on]="topicoId() === t.id"
                      [attr.aria-pressed]="topicoId() === t.id"
                      (click)="alternarTopico(t.id)"
                    >{{ t.titulo }}</button>
                  }
                </div>
              </div>
            }

            <label class="campo">
              <span class="campo__lbl">
                {{ op.topicos.length ? 'Quer contar mais? (opcional se escolheu um tópico)' : 'Conte o que aconteceu' }}
              </span>
              <textarea
                class="tichr-input"
                name="texto"
                rows="4"
                maxlength="1000"
                [ngModel]="texto()"
                (ngModelChange)="texto.set($event)"
                placeholder="Descreva o que aconteceu"
              ></textarea>
              <span class="contador">{{ texto().length }}/1000</span>
            </label>

            <button
              type="submit"
              class="btn-primary"
              [disabled]="!podeEnviar() || enviando()"
            >
              {{ enviando() ? 'Enviando…' : 'Enviar denúncia' }}
            </button>
          </form>
        }
      </app-card>

      <h2 class="secao">Minhas denúncias</h2>
      @if (minhas().length) {
        <ul class="lista">
          @for (d of minhas(); track d.id) {
            <li class="item">
              <div class="item__top">
                <strong>{{ d.denunciadoNome }}</strong>
                <span class="status" [attr.data-status]="d.status">{{ rotulo(d.status) }}</span>
              </div>
              @if (d.topicoTitulo) {
                <span class="item__topico">{{ d.topicoTitulo }}</span>
              }
              @if (d.texto) {
                <p class="item__texto">{{ d.texto }}</p>
              }
              <span class="item__data">{{ formatarData(d.criadaEm.slice(0, 10)) }}</span>
            </li>
          }
        </ul>
      } @else {
        <p class="vazio">Você ainda não fez nenhuma denúncia.</p>
      }
    }
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); font-weight: 600; }
    .titulo { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1.5rem; font-weight: 800; }
    .sub { margin: 0.25rem 0 1rem; color: var(--text-muted); }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .campo { display: flex; flex-direction: column; gap: 0.4rem; }
    .campo__lbl { font-weight: 700; font-size: 0.92rem; }
    textarea.tichr-input { resize: vertical; min-height: 96px; font-family: inherit; }
    .contador { font-size: 0.78rem; color: var(--text-muted); align-self: flex-end; }
    .topicos { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .topico {
      padding: 0.45rem 0.8rem;
      border-radius: 999px;
      border: 2px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-weight: 600;
      cursor: pointer;
    }
    .topico--on { border-color: var(--primary); background: var(--primary); color: #fff; }
    .fechadas { display: flex; gap: 0.75rem; align-items: flex-start; color: var(--text-muted); }
    .fechadas div { display: flex; flex-direction: column; color: var(--text); }
    .fechadas span { color: var(--text-muted); }
    .ok { display: flex; gap: 0.75rem; align-items: flex-start; color: var(--success); margin-bottom: 1rem; }
    .ok div { display: flex; flex-direction: column; color: var(--text); }
    .secao { margin: 1.5rem 0 0.75rem; font-size: 1.1rem; font-weight: 800; }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.8rem 0.9rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
    }
    .item__top { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    .item__topico { font-size: 0.85rem; font-weight: 700; color: var(--primary); }
    .item__texto { margin: 0; font-size: 0.92rem; overflow-wrap: anywhere; }
    .item__data { font-size: 0.78rem; color: var(--text-muted); }
    .status { font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; white-space: nowrap; }
    .status[data-status='PENDENTE'] { color: var(--warning); border: 1px solid var(--warning); }
    .status[data-status='VALIDADA'] { color: var(--success); border: 1px solid var(--success); }
    .status[data-status='INVALIDADA'] { color: var(--text-muted); border: 1px solid var(--border); }
    .vazio { color: var(--text-muted); }
  `,
})
export class StudentDenunciaPage {
  private readonly api = inject(DenunciaApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly formatarData = formatarData;

  protected readonly carregando = signal(true);
  protected readonly opcoes = signal<OpcoesDenuncia | null>(null);
  protected readonly minhas = signal<DenunciaAluno[]>([]);

  protected readonly colegaId = signal('');
  protected readonly topicoId = signal<string | null>(null);
  protected readonly texto = signal('');
  protected readonly enviando = signal(false);
  protected readonly enviada = signal(false);

  protected readonly podeEnviar = computed(
    () => !!this.colegaId() && (!!this.topicoId() || !!this.texto().trim()),
  );

  constructor() {
    this.api
      .opcoes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (op) => {
          this.opcoes.set(op);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });
    this.carregarMinhas();
  }

  protected rotulo(s: StatusDenuncia): string {
    return STATUS_ROTULO[s];
  }

  protected alternarTopico(id: string): void {
    this.topicoId.update((atual) => (atual === id ? null : id));
  }

  protected enviar(): void {
    if (!this.podeEnviar() || this.enviando()) return;
    this.enviando.set(true);
    this.api
      .denunciar({
        denunciadoAlunoId: this.colegaId(),
        topicoId: this.topicoId() ?? undefined,
        texto: this.texto(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.enviada.set(true);
          this.carregarMinhas();
        },
        // O interceptor mostra o motivo (limite, duplicada…); só libera a tela.
        // Janela fechada com a tela aberta (033): troca o formulário pelo aviso.
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          const codigo = (e.error as { code?: string } | null)?.code;
          if (codigo === 'DENUNCIAS_FECHADAS') {
            this.opcoes.update((op) => (op ? { ...op, abertas: false } : op));
          }
        },
      });
  }

  protected nova(): void {
    this.colegaId.set('');
    this.topicoId.set(null);
    this.texto.set('');
    this.enviada.set(false);
    // Reconsulta a janela: o professor pode ter fechado enquanto isso.
    this.api
      .opcoes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (op) => this.opcoes.set(op) });
  }

  private carregarMinhas(): void {
    this.api
      .minhas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (l) => this.minhas.set(l) });
  }
}
