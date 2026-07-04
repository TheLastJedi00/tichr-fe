import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Avatar redondo (dumb): mostra a foto quando há `url`, senão um placeholder
 * sólido com as iniciais do nome (ou um ícone quando não há nome).
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="avatar"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.fontSize.px]="size() * 0.4"
    >
      @if (url()) {
        <img class="avatar__img" [src]="url()" [alt]="nome() || 'Avatar'" />
      } @else if (iniciais()) {
        <span class="avatar__ini">{{ iniciais() }}</span>
      } @else {
        <svg viewBox="0 0 24 24" fill="none" [style.width.px]="size() * 0.55" [style.height.px]="size() * 0.55" aria-hidden="true">
          <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8" />
          <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      }
    </div>
  `,
  styles: `
    .avatar {
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 14%, var(--surface-alt));
      color: var(--primary);
      border: 1px solid var(--border);
      overflow: hidden;
      flex: 0 0 auto;
      user-select: none;
    }
    .avatar__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar__ini {
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1;
    }
  `,
})
export class Avatar {
  readonly nome = input<string | null | undefined>('');
  readonly url = input<string | null | undefined>('');
  readonly size = input(96);

  /** Até 2 iniciais a partir do nome (primeira letra das duas primeiras palavras). */
  protected readonly iniciais = computed(() => {
    const partes = (this.nome() ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '';
    const letras = partes.slice(0, 2).map((p) => p[0]);
    return letras.join('').toUpperCase();
  });
}
