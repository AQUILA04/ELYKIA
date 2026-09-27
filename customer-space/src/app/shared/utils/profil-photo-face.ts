import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import {
  ContourMode,
  FaceDetection,
  LandmarkMode,
  PerformanceMode,
} from '@capacitor-mlkit/face-detection';
import { isE2eMode } from './e2e';

export interface ProfilPhotoPickResult {
  dataUrl: string;
}

async function validateFaceInImage(imagePath: string): Promise<boolean> {
  try {
    const result = await FaceDetection.processImage({
      path: imagePath,
      performanceMode: PerformanceMode.Fast,
      landmarkMode: LandmarkMode.None,
      contourMode: ContourMode.All,
    });
    return result.faces.length > 0;
  } catch (error) {
    console.error('[profil-photo] Face detection error:', error);
    return false;
  }
}

/**
 * Sélection native (caméra / galerie) avec validation visage — même logique que mobile.
 * Sur web / E2E, appeler le file input à la place.
 */
export async function pickProfilPhotoWithFaceValidation(): Promise<ProfilPhotoPickResult> {
  if (Capacitor.getPlatform() !== 'web') {
    let permissions = await Camera.checkPermissions();
    if (permissions.camera !== 'granted') {
      permissions = await Camera.requestPermissions();
    }
    if (permissions.camera !== 'granted') {
      throw new Error("L'accès à la caméra est nécessaire pour prendre une photo.");
    }
  }

  const image = await Camera.getPhoto({
    quality: 50,
    width: 600,
    height: 600,
    allowEditing: true,
    source: CameraSource.Prompt,
    resultType: Capacitor.getPlatform() === 'web' ? CameraResultType.DataUrl : CameraResultType.Uri,
  });

  if (Capacitor.getPlatform() !== 'web' && image.path) {
    const hasFace = await validateFaceInImage(image.path);
    if (!hasFace) {
      throw new Error('La photo doit contenir un visage. Veuillez reprendre la photo.');
    }
    const fileData = await Filesystem.readFile({ path: image.path });
    const data = typeof fileData.data === 'string' ? fileData.data : '';
    return { dataUrl: `data:image/${image.format || 'jpeg'};base64,${data}` };
  }

  if (!image.dataUrl) {
    throw new Error('Impossible de lire la photo sélectionnée.');
  }
  return { dataUrl: image.dataUrl };
}

/** true = utiliser le sélecteur fichier HTML (web / e2e). */
export function shouldUseHtmlFilePickerForPhoto(): boolean {
  return isE2eMode() || Capacitor.getPlatform() === 'web';
}
