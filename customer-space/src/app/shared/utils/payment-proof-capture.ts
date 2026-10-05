import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { shouldUseHtmlFilePickerForPhoto } from './profil-photo-face';

export interface PaymentProofFile {
  blob: Blob;
  fileName: string;
  contentType: string;
  previewUrl: string | null;
}

const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.8;

export function shouldUseHtmlFilePickerForProof(): boolean {
  return shouldUseHtmlFilePickerForPhoto();
}

/** Capture native (caméra / galerie) — sans validation visage. */
export async function pickPaymentProofImageNative(): Promise<PaymentProofFile> {
  if (Capacitor.getPlatform() !== 'web') {
    let permissions = await Camera.checkPermissions();
    if (permissions.camera !== 'granted' || permissions.photos !== 'granted') {
      permissions = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    }
    if (permissions.camera !== 'granted' && permissions.photos !== 'granted') {
      throw new Error("L'accès à la caméra ou à la galerie est nécessaire.");
    }
  }

  const image = await Camera.getPhoto({
    quality: 80,
    width: MAX_IMAGE_EDGE,
    allowEditing: false,
    source: CameraSource.Prompt,
    resultType: Capacitor.getPlatform() === 'web' ? CameraResultType.DataUrl : CameraResultType.Uri,
  });

  let dataUrl: string;
  if (Capacitor.getPlatform() !== 'web' && image.path) {
    const fileData = await Filesystem.readFile({ path: image.path });
    const data = typeof fileData.data === 'string' ? fileData.data : '';
    dataUrl = `data:image/${image.format || 'jpeg'};base64,${data}`;
  } else if (image.dataUrl) {
    dataUrl = image.dataUrl;
  } else {
    throw new Error('Impossible de lire la capture sélectionnée.');
  }

  return compressDataUrlToJpeg(dataUrl, 'justificatif.jpg');
}

export async function fileToPaymentProof(file: File): Promise<PaymentProofFile> {
  const type = (file.type || '').toLowerCase();
  if (type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return {
      blob: file,
      fileName: file.name || 'recu.pdf',
      contentType: 'application/pdf',
      previewUrl: null,
    };
  }
  if (!type.startsWith('image/')) {
    throw new Error('Format non accepté (capture JPEG/PNG ou reçu PDF uniquement).');
  }
  const dataUrl = await readFileAsDataUrl(file);
  return compressDataUrlToJpeg(dataUrl, file.name.replace(/\.\w+$/, '') + '.jpg' || 'justificatif.jpg');
}

export async function compressDataUrlToJpeg(dataUrl: string, fileName: string): Promise<PaymentProofFile> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Compression image indisponible.');
  }
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  const previewUrl = URL.createObjectURL(blob);
  return {
    blob,
    fileName: fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? fileName : `${fileName}.jpg`,
    contentType: 'image/jpeg',
    previewUrl,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image invalide.'));
    img.src = dataUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression échouée.'))),
      type,
      quality,
    );
  });
}

/** Prefill reference only if empty or still equal to the last auto-filled value. */
export function applyDetectedReference(
  currentValue: string | null | undefined,
  lastAutoFilled: string | null,
  detected: string | null | undefined,
): { value: string; autoFilled: string | null } {
  if (!detected) {
    return { value: currentValue ?? '', autoFilled: lastAutoFilled };
  }
  const current = (currentValue ?? '').trim();
  if (!current || (lastAutoFilled != null && current === lastAutoFilled)) {
    return { value: detected, autoFilled: detected };
  }
  return { value: current, autoFilled: lastAutoFilled };
}
