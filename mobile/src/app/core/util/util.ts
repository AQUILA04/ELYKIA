import { Directory, Filesystem } from '@capacitor/filesystem';


export class Util {
  constructor() {
  }

  static isNullOrUndefined(value: any): value is null | undefined {
    return value === null || value === undefined;
  }

  static async getBase64FromPhotoUri(photoUri?: string): Promise<string | null> {
    try {
      // ⚠️ Le path attendu est le chemin original (pas convertFileSrc)
      // Ex: "client_photos/profile_1690839038472.jpeg"
      if (Util.isNullOrUndefined(photoUri)) {
        console.warn('Aucun URI de photo fourni');
        return null;
      }
      const fileName = photoUri?.split('/').pop(); // extrait juste le nom du fichier
      const path = `client_photos/${fileName}`;

      const file = await Filesystem.readFile({
        path,
        directory: Directory.Data
      });

      return `data:image/jpeg;base64,${file.data}`;
    } catch (error) {
      console.error('Erreur lors de la lecture de l’image', error);
      return null;
    }
  }

}
