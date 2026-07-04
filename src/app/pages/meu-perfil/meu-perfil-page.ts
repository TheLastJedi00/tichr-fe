import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import imageCompression from 'browser-image-compression';
import {
  ImageCropperComponent,
  type ImageCroppedEvent,
} from 'ngx-image-cropper';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ProfileService } from '../../core/profile.service';
import { StorageService } from '../../core/storage.service';
import { Avatar } from '../../ui/avatar/avatar';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';
import { FeriasManager } from '../ferias/ferias-manager';

/**
 * Meu Perfil (smart): foto, dados pessoais, @username (com trava de cooldown)
 * e disciplinas. A foto é recortada 1:1 e comprimida no cliente antes do upload.
 */
@Component({
  selector: 'app-meu-perfil-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Card,
    Spinner,
    Avatar,
    Icon,
    Modal,
    ImageCropperComponent,
    FeriasManager,
  ],
  template: `
    <a class="voltar" routerLink="/configuracoes">‹ Configurações</a>
    <h1 class="title">Meu Perfil</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <div class="foto">
        <div class="foto__wrap" [class.foto__wrap--busy]="enviandoFoto()">
          <app-avatar [nome]="nome()" [url]="avatarUrl()" [size]="112" />
          <button
            type="button"
            class="foto__edit"
            (click)="abrirSeletor()"
            [disabled]="enviandoFoto()"
            aria-label="Editar foto"
          >
            <app-icon name="settings" [size]="16" />
          </button>
          @if (enviandoFoto()) {
            <div class="foto__spin"><app-spinner [size]="28" /></div>
          }
        </div>
        <button type="button" class="foto__link" (click)="abrirSeletor()" [disabled]="enviandoFoto()">
          {{ avatarUrl() ? 'Trocar foto' : 'Adicionar foto' }}
        </button>
        <input
          #fileInput
          type="file"
          accept="image/*"
          hidden
          (change)="arquivoSelecionado($event)"
        />
      </div>

      <app-card title="Dados do perfil">
        <form [formGroup]="form" (submit)="$event.preventDefault(); salvar()">
          <label class="campo">
            <span>Usuário do portal (@username)</span>
            <div class="user">
              <span class="user__at">&#64;</span>
              <input
                class="tichr-input"
                formControlName="username"
                placeholder="prof.marina"
                autocapitalize="none"
                autocomplete="off"
                [disabled]="usernameBloqueado()"
              />
            </div>
            @if (usernameBloqueado()) {
              <span class="dica dica--lock">
                🔒 Você poderá alterar seu nome de usuário novamente em {{ cooldownDias() }}
                {{ cooldownDias() === 1 ? 'dia' : 'dias' }}.
              </span>
            } @else {
              @switch (usernameStatus()) {
                @case ('checando') { <span class="dica">Verificando…</span> }
                @case ('ok') { <span class="dica dica--ok">✓ Disponível</span> }
                @case ('tomado') { <span class="dica dica--erro">Já está em uso</span> }
                @default {
                  <span class="dica">Escolha um termo simples — é a chave que seus alunos vão buscar.</span>
                }
              }
            }
          </label>

          <label class="campo">
            <span>Nome de exibição</span>
            <input class="tichr-input" formControlName="nomeExibicao" placeholder="Como quer ser chamado?" />
          </label>
          <label class="campo">
            <span>Área de atuação / disciplina</span>
            <input class="tichr-input" formControlName="disciplina" placeholder="Ex: Programação, Redação…" />
          </label>
          <label class="campo">
            <span>Minha bio</span>
            <textarea class="tichr-input" rows="3" formControlName="bio" placeholder="Um texto curto de apresentação"></textarea>
          </label>

          <div class="campo">
            <span>Minhas disciplinas / competências</span>
            @if (disciplinas().length) {
              <div class="chips">
                @for (d of disciplinas(); track d) {
                  <span class="chip">
                    {{ d }}
                    <button type="button" class="chip__x" (click)="removerDisciplina(d)" aria-label="Remover">×</button>
                  </span>
                }
              </div>
            }
            <div class="add">
              <input
                class="tichr-input"
                placeholder="Ex: Programação"
                [value]="nova()"
                (input)="nova.set($any($event.target).value)"
                (keydown.enter)="$event.preventDefault(); adicionarDisciplina()"
              />
              <button type="button" class="btn-outline" (click)="adicionarDisciplina()">Adicionar</button>
            </div>
          </div>

          @if (salvo()) {
            <p class="ok">✓ Perfil atualizado!</p>
          }

          <button
            class="btn-primary full"
            type="submit"
            [disabled]="salvando() || usernameStatus() === 'tomado'"
          >
            {{ salvando() ? 'Salvando…' : 'Salvar' }}
          </button>
        </form>
      </app-card>

      <div class="ferias-wrap">
        <app-ferias-manager />
      </div>
    }

    <app-modal [open]="cropAberto()" title="Ajuste sua foto" (close)="cancelarFoto()">
      <div class="crop">
        <image-cropper
          [imageChangedEvent]="cropEvent()"
          [maintainAspectRatio]="true"
          [aspectRatio]="1"
          [roundCropper]="true"
          [resizeToWidth]="250"
          output="blob"
          format="jpeg"
          backgroundColor="#ffffff"
          (imageCropped)="aoRecortar($event)"
        />
      </div>
      <div modal-actions>
        <button type="button" class="btn-outline" (click)="cancelarFoto()" [disabled]="enviandoFoto()">
          Cancelar
        </button>
        <button type="button" class="btn-primary" (click)="confirmarFoto()" [disabled]="enviandoFoto() || !recorte()">
          {{ enviandoFoto() ? 'Enviando…' : 'Usar foto' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .voltar:hover { color: var(--primary); }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .foto { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; margin-bottom: 1rem; }
    .foto__wrap { position: relative; line-height: 0; }
    .foto__wrap--busy app-avatar { opacity: 0.5; }
    .foto__edit {
      position: absolute; right: 2px; bottom: 2px;
      width: 34px; height: 34px; display: grid; place-items: center;
      border-radius: 999px; border: 2px solid var(--surface);
      background: var(--primary); color: var(--primary-contrast);
      cursor: pointer;
    }
    .foto__edit:disabled { opacity: 0.6; cursor: default; }
    .foto__spin { position: absolute; inset: 0; display: grid; place-items: center; color: var(--primary); }
    .foto__link { border: none; background: none; color: var(--primary); font-weight: 600; cursor: pointer; padding: 0; }
    .foto__link:disabled { opacity: 0.6; cursor: default; }
    .crop { max-height: 60vh; }
    .campo { display: block; margin-bottom: 1rem; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    textarea.tichr-input { resize: vertical; }
    .user { display: flex; align-items: center; gap: 0.4rem; }
    .user__at { font-weight: 700; color: var(--text-muted); }
    .user .tichr-input { flex: 1; }
    .dica { display: block; margin-top: 0.35rem; font-size: 0.8rem; color: var(--text-muted); }
    .dica--ok { color: var(--success); font-weight: 600; }
    .dica--erro { color: var(--danger); font-weight: 600; }
    .dica--lock { color: var(--text-muted); font-weight: 600; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; }
    .chip { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.3rem 0.625rem; font-weight: 600; font-size: 0.85rem; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); border-radius: 999px; }
    .chip__x { border: none; background: none; color: inherit; font-size: 1rem; line-height: 1; cursor: pointer; padding: 0; }
    .add { display: flex; gap: 0.5rem; }
    .add .tichr-input { flex: 1; }
    .add .btn-outline { white-space: nowrap; }
    .ok { color: var(--success); font-weight: 600; margin: 0 0 0.75rem; }
    .full { width: 100%; }
    .ferias-wrap { margin-top: 1rem; }
  `,
})
export class MeuPerfilPage {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly storage = inject(StorageService);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly disciplinas = signal<string[]>([]);
  protected readonly nova = signal('');
  protected readonly usernameStatus = signal<'vazio' | 'checando' | 'ok' | 'tomado'>(
    'vazio',
  );

  // Avatar
  protected readonly nome = signal('');
  protected readonly avatarUrl = signal<string | undefined>(undefined);
  protected readonly cropAberto = signal(false);
  protected readonly cropEvent = signal<Event | null>(null);
  protected readonly enviandoFoto = signal(false);
  private readonly recorteBlob = signal<Blob | null>(null);
  protected readonly recorte = this.recorteBlob.asReadonly();

  // Trava de @username
  protected readonly usernameBloqueado = signal(false);
  protected readonly cooldownDias = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    nomeExibicao: [''],
    username: [''],
    disciplina: [''],
    bio: [''],
  });

  constructor() {
    this.profileService.load().subscribe({
      next: (p) => {
        this.form.patchValue({
          nomeExibicao: p.nomeExibicao ?? '',
          username: p.username ?? '',
          disciplina: p.disciplina ?? '',
          bio: p.bio ?? '',
        });
        this.disciplinas.set(p.disciplinas ?? []);
        this.nome.set(p.nomeExibicao ?? '');
        this.avatarUrl.set(p.avatarUrl);
        this.aplicarTrava(p.podeAlterarUsername, p.diasParaTrocarUsername);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });

    this.form.controls.nomeExibicao.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.nome.set(v));

    this.form.controls.username.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((raw) => {
          const u = raw.trim().replace(/^@/, '');
          if (u.length < 3) {
            this.usernameStatus.set('vazio');
            return [];
          }
          this.usernameStatus.set('checando');
          return this.profileService.checkUsername(u);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) =>
        this.usernameStatus.set(res.disponivel ? 'ok' : 'tomado'),
      );
  }

  /** Aplica (ou libera) a trava do @username conforme o cooldown do backend. */
  private aplicarTrava(podeAlterar?: boolean, dias?: number): void {
    const bloqueado = podeAlterar === false;
    this.usernameBloqueado.set(bloqueado);
    this.cooldownDias.set(dias ?? 0);
    const ctrl = this.form.controls.username;
    if (bloqueado) ctrl.disable({ emitEvent: false });
    else ctrl.enable({ emitEvent: false });
  }

  // ---- Avatar (crop -> compress -> upload) ----

  protected abrirSeletor(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected arquivoSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.recorteBlob.set(null);
    this.cropEvent.set(event);
    this.cropAberto.set(true);
  }

  protected aoRecortar(e: ImageCroppedEvent): void {
    this.recorteBlob.set(e.blob ?? null);
  }

  protected cancelarFoto(): void {
    if (this.enviandoFoto()) return;
    this.cropAberto.set(false);
    this.recorteBlob.set(null);
    this.limparInput();
  }

  protected async confirmarFoto(): Promise<void> {
    const blob = this.recorteBlob();
    const uid = this.profileService.profile()?.uid;
    if (!blob || !uid) return;
    this.enviandoFoto.set(true);
    try {
      // Compressão silenciosa: máx. 250px, ~50KB.
      const arquivo = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const comprimido = await imageCompression(arquivo, {
        maxSizeMB: 0.05,
        maxWidthOrHeight: 250,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      const url = await this.storage.uploadAvatar(uid, comprimido);
      await new Promise<void>((resolve, reject) =>
        this.profileService.update({ avatarUrl: url }).subscribe({
          next: () => resolve(),
          error: (err) => reject(err),
        }),
      );
      this.avatarUrl.set(url);
      this.cropAberto.set(false);
      this.recorteBlob.set(null);
      this.limparInput();
    } catch {
      // Erro de upload/rede já sobe pelo interceptor (quando HTTP); apenas libera a UI.
    } finally {
      this.enviandoFoto.set(false);
    }
  }

  private limparInput(): void {
    const el = this.fileInput()?.nativeElement;
    if (el) el.value = '';
  }

  // ---- Disciplinas / salvar ----

  protected adicionarDisciplina(): void {
    const d = this.nova().trim();
    if (d && !this.disciplinas().includes(d)) {
      this.disciplinas.update((lista) => [...lista, d]);
    }
    this.nova.set('');
  }

  protected removerDisciplina(d: string): void {
    this.disciplinas.update((lista) => lista.filter((x) => x !== d));
  }

  protected salvar(): void {
    this.salvando.set(true);
    this.salvo.set(false);
    const raw = this.form.getRawValue();
    const username = raw.username.trim().replace(/^@/, '');
    this.profileService
      .update({
        nomeExibicao: raw.nomeExibicao,
        disciplina: raw.disciplina,
        bio: raw.bio,
        disciplinas: this.disciplinas(),
        ...(username ? { username } : {}),
      })
      .subscribe({
        next: (p) => {
          this.salvando.set(false);
          this.salvo.set(true);
          // Reaplica a trava (uma troca de @username reinicia o cooldown).
          this.aplicarTrava(p.podeAlterarUsername, p.diasParaTrocarUsername);
        },
        error: () => this.salvando.set(false),
      });
  }
}
