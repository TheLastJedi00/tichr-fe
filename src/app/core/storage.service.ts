import { Injectable } from '@angular/core';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';
import { firebaseApp } from './firebase-app';

/**
 * Upload da foto de perfil ao Firebase Storage (client-side). O micro-arquivo
 * já chega recortado (1:1) e comprimido (~50KB) pela página; aqui só subimos e
 * capturamos a URL pública para o backend persistir no perfil.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private storage?: FirebaseStorage;

  private conectar(): FirebaseStorage {
    if (!this.storage) {
      this.storage = getStorage(firebaseApp());
    }
    return this.storage;
  }

  /** Sobe o avatar em `avatars/{uid}.jpg` (sobrescreve) e devolve a URL pública. */
  async uploadAvatar(uid: string, arquivo: Blob): Promise<string> {
    const alvo = ref(this.conectar(), `avatars/${uid}.jpg`);
    await uploadBytes(alvo, arquivo, { contentType: 'image/jpeg' });
    return getDownloadURL(alvo);
  }
}
