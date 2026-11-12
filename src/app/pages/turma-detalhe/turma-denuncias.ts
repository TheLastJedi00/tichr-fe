import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import {
  duracao,
  formatarData,
  formatarDataHoraSegundos,
  formatarHora,
  tempoRelativo,
} from '../../core/date-format';
import {
  DenunciaApiService,
  DenunciaProfessor,
  dividirIgual,
  EstadoJanelas,
  GrupoDenuncia,
  JanelaDenuncia,
  SugestaoGrupo,
  TETO_PONTOS_DENUNCIA,
} from '../../core/denuncia-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

/** Um grupo (confirmado) com as denúncias dele, em ordem cronológica. */
interface GrupoTela {
  grupo: GrupoDenuncia;
  denuncias: DenunciaProfessor[];
}

/** Uma sugestão de grupo com as denúncias dela. */
interface SugestaoTela {
  sugestao: SugestaoGrupo;
  denuncias: DenunciaProfessor[];
}

/** Tudo o que está pendente contra um aluno. */
interface Bloco {
  denunciadoAlunoId: string;
  denunciadoNome: string;
  xpDenunciado: number;
  total: number;
  grupos: GrupoTela[];
  sugestoes: SugestaoTela[];
  avulsas: DenunciaProfessor[];
}

/** O que está sendo validado: uma denúncia avulsa ou um grupo. */
type Validando =
  | { tipo: 'AVULSA'; denuncia: DenunciaProfessor }
  | { tipo: 'GRUPO'; tela: GrupoTela };

/**
 * Aba "Denúncias" do detalhe da turma (specs 032 e 033). Smart: carrega e
 * resolve as denúncias da turma, agrupadas por denunciado. Várias denúncias
 * contra o mesmo aluno viram um grupo (sugerido por tópico, confirmado pelo
 * professor): validar o grupo tira uma pontuação do denunciado e divide entre
 * os autores. Avulsa: validar transfere do denunciado ao autor. Invalidar só
 * arquiva. A foto existe só em denúncias antigas (anteriores à 033).
 */
@Component({
  selector: 'app-turma-denuncias',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Card, Icon, Modal, Spinner],
  template: `
    @if (janela(); as j) {
      <div class="barra">
        <span class="barra__estado" [class.barra__estado--on]="j.abertas">
          <app-icon [name]="j.abertas ? 'flag' : 'lock'" [size]="16" />
          {{ j.abertas ? 'Abertas: os alunos podem denunciar' : 'Fechadas: os alunos não conseguem denunciar' }}
        </span>
        <button
          type="button"
          [class]="j.abertas ? 'btn-outline' : 'btn-primary'"
          [disabled]="alternandoJanela()"
          (click)="alternarJanela.emit()"
        >
          {{ j.abertas ? 'Fechar denúncias' : 'Abrir denúncias' }}
        </button>
      </div>
      @if (j.janelas.length) {
        <label class="filtro">
          <span>Janela</span>
          <select class="tichr-input" [ngModel]="filtroJanela()" (ngModelChange)="filtroJanela.set($event)">
            <option value="">Todas</option>
            @for (jn of j.janelas; track jn.id) {
              <option [value]="jn.id">{{ rotuloJanela(jn) }}</option>
            }
            <option value="__sem">Antes das janelas</option>
          </select>
        </label>
      }
    }

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="28" /></div>
    } @else {
      @if (blocos().length === 0) {
        <app-card><p class="muted">Nenhuma denúncia aguardando você.</p></app-card>
      }

      <div class="blocos">
        @for (b of blocos(); track b.denunciadoAlunoId) {
          <section class="bloco">
            <header class="bloco__top">
              <h3 class="bloco__nome">
                {{ b.denunciadoNome }}
                <span class="bloco__qtd">{{ b.total }} {{ b.total === 1 ? 'pendente' : 'pendentes' }}</span>
              </h3>
              <span class="bloco__xp">{{ b.xpDenunciado }} {{ nomePontuacao() }}</span>
              @if (selecionadasDe(b.denunciadoAlunoId).length >= 2) {
                <button
                  type="button"
                  class="btn-primary"
                  [disabled]="ocupado()"
                  (click)="agrupar(selecionadasDe(b.denunciadoAlunoId))"
                >
                  Agrupar selecionadas ({{ selecionadasDe(b.denunciadoAlunoId).length }})
                </button>
              }
            </header>

            @for (g of b.grupos; track g.grupo.id) {
              <app-card>
                <div class="grupo">
                  <div class="grupo__top">
                    <span class="grupo__tit">
                      <app-icon name="users" [size]="16" />
                      Grupo · {{ g.denuncias.length }} denúncias
                      @if (g.grupo.topicoTitulo) { <span class="tag">{{ g.grupo.topicoTitulo }}</span> }
                    </span>
                    <span class="den__data">{{ intervalo(g.denuncias) }}</span>
                  </div>
                  <ol class="autores">
                    @for (d of g.denuncias; track d.id) {
                      <li class="autor">
                        <div class="autor__top">
                          <strong>{{ d.autorNome }}</strong>
                          <span class="den__data">{{ dataHora(d.criadaEm) }} · {{ relativo(d.criadaEm) }}</span>
                        </div>
                        @if (d.topicoId !== g.grupo.topicoId) {
                          <span class="tag tag--aviso">
                            <app-icon name="alert" [size]="12" /> motivo diferente{{ d.topicoTitulo ? ': ' + d.topicoTitulo : '' }}
                          </span>
                        }
                        @if (d.texto) { <p class="den__texto">{{ d.texto }}</p> }
                        @if (rotuloJanelaDe(d); as rj) { <span class="den__janela">{{ rj }}</span> }
                        <div class="autor__acoes">
                          @if (d.temImagem) {
                            <button type="button" class="link" (click)="verFoto(d)">Ver foto</button>
                          }
                          <button type="button" class="link" [disabled]="ocupado()" (click)="desassociar(g.grupo, d)">
                            Desassociar
                          </button>
                        </div>
                      </li>
                    }
                  </ol>
                  <div class="den__acoes">
                    <button type="button" class="btn-outline" [disabled]="ocupado()" (click)="invalidarGrupo(g.grupo)">
                      Invalidar grupo
                    </button>
                    <button type="button" class="btn-primary" [disabled]="ocupado()" (click)="abrirValidarGrupo(g)">
                      Validar grupo
                    </button>
                  </div>
                </div>
              </app-card>
            }

            @for (s of b.sugestoes; track s.sugestao.topicoId) {
              <app-card>
                <div class="grupo grupo--sugestao">
                  <div class="grupo__top">
                    <span class="grupo__tit">
                      <app-icon name="sparkles" [size]="16" />
                      Sugestão: {{ s.denuncias.length }} denúncias pelo mesmo motivo
                      @if (s.sugestao.topicoTitulo) { <span class="tag">{{ s.sugestao.topicoTitulo }}</span> }
                    </span>
                    <span class="den__data">{{ intervalo(s.denuncias) }}</span>
                  </div>
                  <ol class="autores">
                    @for (d of s.denuncias; track d.id) {
                      <li class="autor">
                        <div class="autor__top">
                          <strong>{{ d.autorNome }}</strong>
                          <span class="den__data">{{ dataHora(d.criadaEm) }} · {{ relativo(d.criadaEm) }}</span>
                        </div>
                        @if (d.texto) { <p class="den__texto">{{ d.texto }}</p> }
                      </li>
                    }
                  </ol>
                  <div class="den__acoes">
                    <button type="button" class="btn-primary" [disabled]="ocupado()" (click)="agrupar(s.sugestao.denunciaIds)">
                      Agrupar
                    </button>
                  </div>
                </div>
              </app-card>
            }

            @for (d of b.avulsas; track d.id) {
              <app-card>
                <div class="den">
                  <div class="den__top">
                    <label class="sel">
                      <input
                        type="checkbox"
                        [checked]="selecionadas().has(d.id)"
                        (change)="alternarSelecao(d.id)"
                        [attr.aria-label]="'Selecionar a denúncia de ' + d.autorNome"
                      />
                      <span><strong>{{ d.autorNome }}</strong> denunciou <strong>{{ d.denunciadoNome }}</strong></span>
                    </label>
                    <span class="den__data">{{ dataHora(d.criadaEm) }} · {{ relativo(d.criadaEm) }}</span>
                  </div>
                  @if (d.topicoTitulo) { <span class="tag">{{ d.topicoTitulo }}</span> }
                  @if (d.texto) { <p class="den__texto">{{ d.texto }}</p> }
                  @if (rotuloJanelaDe(d); as rj) { <span class="den__janela">{{ rj }}</span> }
                  <div class="den__acoes">
                    @if (d.temImagem) {
                      <button type="button" class="btn-outline" (click)="verFoto(d)">
                        <app-icon name="eye" [size]="16" /> Ver foto
                      </button>
                    }
                    @for (g of b.grupos; track g.grupo.id) {
                      <button type="button" class="btn-outline" [disabled]="ocupado()" (click)="associar(g.grupo, d)">
                        Adicionar ao grupo{{ b.grupos.length > 1 ? ' ' + ($index + 1) : '' }}
                      </button>
                    }
                    <button type="button" class="btn-outline" [disabled]="ocupado()" (click)="invalidar(d)">
                      Invalidar
                    </button>
                    <button type="button" class="btn-primary" [disabled]="ocupado()" (click)="abrirValidar(d)">
                      Validar
                    </button>
                  </div>
                </div>
              </app-card>
            }
          </section>
        }
      </div>

      @if (resolvidas().length) {
        <button type="button" class="historico" (click)="verHistorico.set(!verHistorico())">
          {{ verHistorico() ? 'Esconder' : 'Ver' }} resolvidas ({{ resolvidas().length }})
        </button>
        @if (verHistorico()) {
          <ul class="hist">
            @for (d of resolvidas(); track d.id) {
              <li class="hist__item">
                <span>
                  <strong>{{ d.autorNome }}</strong> → <strong>{{ d.denunciadoNome }}</strong>
                  @if (d.topicoTitulo) { · {{ d.topicoTitulo }} }
                  <span class="den__data"> · {{ dataHora(d.criadaEm) }}</span>
                </span>
                <span class="hist__res" [attr.data-status]="d.status">
                  @if (d.status === 'VALIDADA') {
                    Validada{{ d.grupoId ? ' em grupo' : '' }} · {{ d.pontosTransferidos ?? 0 }} {{ nomePontuacao() }}
                  } @else {
                    Invalidada
                  }
                </span>
              </li>
            }
          </ul>
        }
      }
    }

    <app-modal [open]="!!validando()" [title]="tituloValidar()" (close)="validando.set(null)">
      @if (validando(); as v) {
        <div class="val">
          @if (pontuacaoAtiva()) {
            <label class="campo">
              <span class="campo__lbl">
                @if (v.tipo === 'GRUPO') {
                  Quantos {{ nomePontuacao() }} saem de {{ denunciadoDe(v) }} (divididos entre {{ v.tela.denuncias.length }})?
                } @else {
                  Quantos {{ nomePontuacao() }} {{ v.denuncia.autorNome }} recebe?
                }
              </span>
              <input
                class="tichr-input"
                type="number"
                min="0"
                [max]="teto"
                step="100"
                [ngModel]="pontos()"
                (ngModelChange)="pontos.set(+$event || 0)"
              />
            </label>
            <p class="val__resumo">
              <strong>−{{ transferencia() }}</strong> de {{ denunciadoDe(v) }}
              @if (previaPartes().length) {
                →
                @for (p of previaPartes(); track p.nome; let ultimo = $last) {
                  <strong>+{{ p.pontos }}</strong> {{ p.nome }}{{ ultimo ? '' : ',' }}
                }
              }
            </p>
            @if (v.tipo === 'GRUPO' && transferencia() % v.tela.denuncias.length !== 0) {
              <p class="val__nota">A sobra da divisão vai para quem denunciou primeiro.</p>
            }
            @if (pontos() > xpDe(v)) {
              <p class="val__aviso">
                <app-icon name="alert" [size]="16" />
                {{ denunciadoDe(v) }} tem só {{ xpDe(v) }} {{ nomePontuacao() }}: a transferência fica limitada a isso.
              </p>
            }
            @if (pontos() > teto) {
              <p class="val__aviso">O máximo por validação é {{ teto }}.</p>
            }
          } @else {
            <p class="val__resumo">
              A pontuação está desligada nesta turma: validar só registra, sem mexer em pontos.
            </p>
          }
        </div>
      }
      <div modal-actions>
        <button type="button" class="btn-outline" (click)="validando.set(null)">Cancelar</button>
        <button
          type="button"
          class="btn-primary"
          [disabled]="ocupado() || pontos() < 0 || pontos() > teto"
          (click)="confirmarValidar()"
        >
          Validar
        </button>
      </div>
    </app-modal>

    <app-modal [open]="!!fotoUrl()" title="Foto da denúncia" (close)="fotoUrl.set(null)">
      @if (fotoUrl(); as url) {
        <img class="foto" [src]="url" alt="Foto anexada pelo aluno" />
      }
      <div modal-actions>
        <button type="button" class="btn-outline" (click)="fotoUrl.set(null)">Fechar</button>
      </div>
    </app-modal>
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 2rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0; }
    .barra { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .barra__estado { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; color: var(--text-muted); }
    .barra__estado--on { color: var(--success); }
    .filtro { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-weight: 700; font-size: 0.9rem; }
    .filtro select { max-width: 22rem; }
    .blocos { display: flex; flex-direction: column; gap: 1.25rem; }
    .bloco { display: flex; flex-direction: column; gap: 0.6rem; }
    .bloco__top { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; border-bottom: 2px solid var(--border); padding-bottom: 0.4rem; }
    .bloco__nome { margin: 0; font-size: 1.05rem; font-weight: 800; display: flex; align-items: baseline; gap: 0.5rem; }
    .bloco__qtd { font-size: 0.8rem; font-weight: 700; color: var(--warning); }
    .bloco__xp { font-size: 0.85rem; color: var(--text-muted); margin-right: auto; }
    .grupo { display: flex; flex-direction: column; gap: 0.5rem; }
    .grupo__top { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .grupo__tit { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 800; flex-wrap: wrap; }
    .grupo--sugestao .grupo__tit { color: var(--primary); }
    .autores { margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .autor { display: flex; flex-direction: column; gap: 0.2rem; }
    .autor__top { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .autor__acoes { display: flex; gap: 0.75rem; }
    .link { background: none; border: none; padding: 0; font: inherit; font-size: 0.85rem; font-weight: 700; color: var(--primary); cursor: pointer; }
    .link:disabled { opacity: 0.5; cursor: not-allowed; }
    .tag { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.78rem; font-weight: 700; color: var(--primary); border: 1px solid var(--primary); border-radius: 999px; padding: 0.05rem 0.5rem; }
    .tag--aviso { color: var(--warning); border-color: var(--warning); }
    .den { display: flex; flex-direction: column; gap: 0.4rem; }
    .den__top { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .sel { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    .sel input { width: 1.05rem; height: 1.05rem; accent-color: var(--primary); }
    .den__data { font-size: 0.8rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .den__janela { font-size: 0.78rem; color: var(--text-muted); }
    .den__texto { margin: 0; overflow-wrap: anywhere; }
    .den__acoes { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; margin-top: 0.25rem; }
    .den__acoes button { display: inline-flex; align-items: center; gap: 0.35rem; }
    .historico { margin-top: 1rem; background: none; border: none; color: var(--primary); font: inherit; font-weight: 700; cursor: pointer; padding: 0; }
    .hist { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .hist__item { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; font-size: 0.9rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
    .hist__res { font-weight: 700; color: var(--text-muted); }
    .hist__res[data-status='VALIDADA'] { color: var(--success); }
    .val { display: flex; flex-direction: column; gap: 0.75rem; }
    .campo { display: flex; flex-direction: column; gap: 0.35rem; }
    .campo__lbl { font-weight: 700; }
    .val__resumo { margin: 0; line-height: 1.6; }
    .val__nota { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
    .val__aviso { display: flex; gap: 0.4rem; align-items: flex-start; margin: 0; color: var(--warning); font-weight: 600; font-size: 0.9rem; }
    .foto { max-width: 100%; max-height: 70vh; border-radius: 10px; display: block; margin: 0 auto; }
  `,
})
export class TurmaDenuncias implements OnInit {
  private readonly api = inject(DenunciaApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly turmaId = input.required<string>();
  readonly pontuacaoAtiva = input(true);
  readonly nomePontuacao = input('XP');
  /** Janela de denúncia (033): estado e histórico, mantidos pela página. */
  readonly janela = input<EstadoJanelas | null>(null);
  readonly alternandoJanela = input(false);
  readonly alternarJanela = output<void>();
  /** Quantas pendentes sobraram (o badge da aba acompanha). */
  readonly pendentesMudou = output<number>();

  protected readonly teto = TETO_PONTOS_DENUNCIA;
  protected readonly carregando = signal(true);
  protected readonly ocupado = signal(false);
  private readonly todas = signal<DenunciaProfessor[]>([]);
  private readonly grupos = signal<GrupoDenuncia[]>([]);
  private readonly sugestoes = signal<SugestaoGrupo[]>([]);
  /** '' = todas; '__sem' = denúncias anteriores às janelas (033). */
  protected readonly filtroJanela = signal('');
  /** Avulsas marcadas para agrupar à mão. */
  protected readonly selecionadas = signal(new Set<string>());
  protected readonly verHistorico = signal(false);
  protected readonly validando = signal<Validando | null>(null);
  protected readonly pontos = signal(0);
  protected readonly fotoUrl = signal<string | null>(null);
  /** Atualiza o "há N min" sem recarregar. */
  private readonly agora = signal(new Date());

  private readonly passaFiltro = (d: DenunciaProfessor): boolean => {
    const f = this.filtroJanela();
    if (!f) return true;
    return f === '__sem' ? !d.janelaId : d.janelaId === f;
  };

  private readonly porId = computed(() => new Map(this.todas().map((d) => [d.id, d])));

  protected readonly resolvidas = computed(() =>
    this.todas().filter((d) => d.status !== 'PENDENTE' && this.passaFiltro(d)),
  );

  /** Pendentes agrupadas por denunciado: grupos, sugestões e avulsas. */
  protected readonly blocos = computed<Bloco[]>(() => {
    const porId = this.porId();
    const lista = (ids: string[]) =>
      ids.map((id) => porId.get(id)).filter((d): d is DenunciaProfessor => !!d);
    const pendentes = this.todas().filter((d) => d.status === 'PENDENTE');
    const naSugestao = new Set(this.sugestoes().flatMap((s) => s.denunciaIds));
    const blocos = new Map<string, Bloco>();
    const bloco = (d: { denunciadoAlunoId: string; denunciadoNome: string; xpDenunciado?: number }) => {
      let b = blocos.get(d.denunciadoAlunoId);
      if (!b) {
        b = {
          denunciadoAlunoId: d.denunciadoAlunoId,
          denunciadoNome: d.denunciadoNome,
          xpDenunciado: d.xpDenunciado ?? 0,
          total: 0,
          grupos: [],
          sugestoes: [],
          avulsas: [],
        };
        blocos.set(d.denunciadoAlunoId, b);
      }
      return b;
    };
    for (const g of this.grupos().filter((x) => x.status === 'PENDENTE')) {
      const denuncias = lista(g.denunciaIds);
      if (!denuncias.some(this.passaFiltro)) continue;
      const b = bloco(g);
      b.grupos.push({ grupo: g, denuncias });
      b.total += denuncias.length;
    }
    for (const s of this.sugestoes()) {
      const denuncias = lista(s.denunciaIds);
      if (!denuncias.some(this.passaFiltro)) continue;
      const b = bloco({ ...s, xpDenunciado: denuncias[0]?.xpDenunciado });
      b.sugestoes.push({ sugestao: s, denuncias });
      b.total += denuncias.length;
    }
    for (const d of pendentes) {
      if (d.grupoId || naSugestao.has(d.id) || !this.passaFiltro(d)) continue;
      const b = bloco(d);
      b.avulsas.push(d);
      b.total += 1;
    }
    for (const b of blocos.values()) {
      b.avulsas.sort((x, y) => x.criadaEm.localeCompare(y.criadaEm));
    }
    return [...blocos.values()].sort(
      (a, b) => b.total - a.total || a.denunciadoNome.localeCompare(b.denunciadoNome, 'pt-BR'),
    );
  });

  protected readonly tituloValidar = computed(() =>
    this.validando()?.tipo === 'GRUPO' ? 'Validar grupo de denúncias' : 'Validar denúncia',
  );

  protected readonly transferencia = computed(() => {
    const v = this.validando();
    if (!v) return 0;
    return Math.max(0, Math.min(this.pontos(), this.xpDe(v)));
  });

  /** "+a Ana, +b Caio, +c Duda" na ordem cronológica (a sobra vai aos primeiros). */
  protected readonly previaPartes = computed(() => {
    const v = this.validando();
    if (!v) return [];
    const autores = v.tipo === 'GRUPO' ? v.tela.denuncias.map((d) => d.autorNome) : [v.denuncia.autorNome];
    const partes = dividirIgual(this.transferencia(), autores.length);
    return autores.map((nome, i) => ({ nome, pontos: partes[i] }));
  });

  ngOnInit(): void {
    this.carregar();
    const t = setInterval(() => this.agora.set(new Date()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(t));
  }

  // ===== exibição =====

  protected dataHora(iso: string): string {
    return formatarDataHoraSegundos(iso);
  }

  protected relativo(iso: string): string {
    return tempoRelativo(iso, this.agora());
  }

  /** "14:02:10 → 14:05:33 (3 min)" entre a primeira e a última. */
  protected intervalo(denuncias: DenunciaProfessor[]): string {
    if (!denuncias.length) return '';
    const datas = denuncias.map((d) => d.criadaEm).sort();
    const [primeira, ultima] = [datas[0], datas[datas.length - 1]];
    const hms = (iso: string) => formatarDataHoraSegundos(iso).slice(11);
    return primeira === ultima
      ? formatarDataHoraSegundos(primeira)
      : `${hms(primeira)} → ${hms(ultima)} (${duracao(primeira, ultima)})`;
  }

  protected rotuloJanela(j: JanelaDenuncia): string {
    const fim = j.fechadaEm ? formatarHora(j.fechadaEm) : 'aberta';
    return `${formatarData(this.diaLocal(j.abertaEm))} · ${formatarHora(j.abertaEm)}–${fim}`;
  }

  /** "Janela aberta às 14:02, fechada às 14:51" (033 #11). */
  protected rotuloJanelaDe(d: DenunciaProfessor): string {
    const j = this.janela()?.janelas.find((x) => x.id === d.janelaId);
    if (!j) return '';
    const fim = j.fechadaEm ? `, fechada às ${formatarHora(j.fechadaEm)}` : ', ainda aberta';
    return `Janela aberta às ${formatarHora(j.abertaEm)}${fim}`;
  }

  protected selecionadasDe(denunciadoAlunoId: string): string[] {
    const porId = this.porId();
    return [...this.selecionadas()].filter((id) => porId.get(id)?.denunciadoAlunoId === denunciadoAlunoId);
  }

  protected denunciadoDe(v: Validando): string {
    return v.tipo === 'GRUPO' ? v.tela.grupo.denunciadoNome : v.denuncia.denunciadoNome;
  }

  protected xpDe(v: Validando): number {
    return v.tipo === 'GRUPO' ? v.tela.grupo.xpDenunciado : v.denuncia.xpDenunciado;
  }

  // ===== ações =====

  protected alternarSelecao(id: string): void {
    this.selecionadas.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected agrupar(denunciaIds: string[]): void {
    this.executar(this.api.criarGrupo(this.turmaId(), denunciaIds), () => {
      this.selecionadas.update((s) => new Set([...s].filter((id) => !denunciaIds.includes(id))));
    });
  }

  protected associar(g: GrupoDenuncia, d: DenunciaProfessor): void {
    this.executar(this.api.associar(this.turmaId(), g.id, d.id));
  }

  protected desassociar(g: GrupoDenuncia, d: DenunciaProfessor): void {
    this.executar(this.api.desassociar(this.turmaId(), g.id, d.id));
  }

  protected abrirValidar(d: DenunciaProfessor): void {
    this.pontos.set(d.pontosSugeridos ?? 0);
    this.validando.set({ tipo: 'AVULSA', denuncia: d });
  }

  protected abrirValidarGrupo(tela: GrupoTela): void {
    this.pontos.set(tela.grupo.pontosSugeridos ?? 0);
    this.validando.set({ tipo: 'GRUPO', tela });
  }

  protected confirmarValidar(): void {
    const v = this.validando();
    if (!v || this.ocupado()) return;
    const pontos = this.pontuacaoAtiva() ? this.pontos() : 0;
    const req =
      v.tipo === 'GRUPO'
        ? this.api.validarGrupo(this.turmaId(), v.tela.grupo.id, pontos)
        : this.api.validar(this.turmaId(), v.denuncia.id, pontos);
    this.executar(req, () => this.validando.set(null));
  }

  protected invalidar(d: DenunciaProfessor): void {
    this.executar(this.api.invalidar(this.turmaId(), d.id));
  }

  protected invalidarGrupo(g: GrupoDenuncia): void {
    this.executar(this.api.invalidarGrupo(this.turmaId(), g.id));
  }

  protected verFoto(d: DenunciaProfessor): void {
    this.api
      .urlImagem(this.turmaId(), d.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: ({ url }) => this.fotoUrl.set(url) });
  }

  // ===== apoio =====

  /** Roda uma ação, trava os botões enquanto isso e recarrega a aba no fim. */
  private executar(req: Observable<unknown>, depois?: () => void): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        depois?.();
        this.ocupado.set(false);
        this.carregar();
      },
      // O interceptor mostra o motivo; recarrega porque o estado pode ter mudado.
      error: () => {
        this.ocupado.set(false);
        this.carregar();
      },
    });
  }

  private carregar(): void {
    forkJoin({ lista: this.api.listarDaTurma(this.turmaId()), g: this.api.grupos(this.turmaId()) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lista, g }) => {
          this.todas.set(lista);
          this.grupos.set(g.grupos);
          this.sugestoes.set(g.sugestoes);
          this.carregando.set(false);
          this.pendentesMudou.emit(lista.filter((d) => d.status === 'PENDENTE').length);
        },
        error: () => this.carregando.set(false),
      });
  }

  /** 'YYYY-MM-DD' no fuso local (o formatarData trata a string como dia). */
  private diaLocal(iso: string): string {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
