# Plan d'intégration de la détection de visage (Google ML Kit)

## Objectif
Valider que la photo de profil prise lors de l'enregistrement d'un nouveau client contient bien un visage humain.

## Solution Technique
Utilisation du plugin Capacitor pour Google ML Kit : **@capacitor-mlkit/face-detection**.
Cette solution est native, performante et légère pour l'application.

## Étapes d'implémentation

### 1. Installation des dépendances
Exécuter les commandes suivantes à la racine du projet mobile (`mobile/`) :

```bash
npm install @capacitor-mlkit/face-detection
npx cap sync
```

### 2. Configuration Android
Aucune configuration supplémentaire complexe n'est généralement requise dans `build.gradle` pour ce plugin, car il télécharge dynamiquement les modèles ML si nécessaire ou utilise ceux du système.

Cependant, assurez-vous que votre `android/variables.gradle` utilise des versions récentes des bibliothèques AndroidX.

### 3. Configuration iOS (si applicable)
Si vous compilez pour iOS, ajoutez les clés suivantes dans `ios/App/App/Info.plist` si elles ne sont pas déjà présentes (nécessaires pour l'accès caméra) :
- `NSCameraUsageDescription`

### 4. Implémentation dans `new-client.page.ts`

#### A. Importation
```typescript
import { FaceDetection } from '@capacitor-mlkit/face-detection';
```

#### B. Logique de validation
Créer une méthode privée pour vérifier l'image après la capture.

```typescript
private async validateFaceInImage(imagePath: string): Promise<boolean> {
  try {
    // 1. Traitement de l'image
    const result = await FaceDetection.processImage({
      path: imagePath,
      detectionMode: 'fast', // 'fast' privilégie la vitesse, suffisant pour détecter une présence
      landmarkMode: 'none',  // Pas besoin des détails (yeux, bouche) pour ce cas d'usage
      contourMode: 'all',    // Aide à définir la forme du visage
    });

    // 2. Vérification
    if (result.faces.length === 0) {
      console.warn('Aucun visage détecté.');
      return false;
    }

    // Optionnel : Vérifier s'il y a trop de visages
    if (result.faces.length > 1) {
      console.warn('Plusieurs visages détectés.');
      // return false; // Décommenter si on veut forcer une photo individuelle
    }

    // Un visage trouvé
    return true;

  } catch (error) {
    console.error('Erreur lors de la détection de visage:', error);
    // En cas d'erreur technique (ex: modèle pas encore téléchargé), 
    // on peut choisir de bloquer ou de laisser passer (fail-open vs fail-closed).
    // Ici, on retourne false pour forcer une nouvelle tentative safe.
    return false; 
  }
}
```

#### C. Intégration dans le flux de capture
Dans la méthode où la photo est prise (ex: `takePicture()` ou `captureImage()`) :

```typescript
async onPhotoTaken(photoPath: string) {
  // Afficher un loader si nécessaire car la détection peut prendre quelques millisecondes
  
  const hasFace = await this.validateFaceInImage(photoPath);
  
  if (!hasFace) {
    // Afficher une alerte à l'utilisateur
    // ex: this.toastService.presentToast('Aucun visage détecté. Veuillez reprendre la photo.');
    return; // Ne pas sauvegarder la photo
  }

  // Si valide, continuer le processus de sauvegarde...
  this.clientForm.patchValue({ photo: photoPath });
}
```

### 5. Tests
1.  **Cas nominal** : Prendre une photo d'une personne -> Doit valider.
2.  **Cas erreur** : Prendre une photo d'un objet ou d'un mur -> Doit refuser.
3.  **Cas limite** : Visage partiel ou de profil -> Vérifier si le mode `fast` est suffisant ou passer en `accurate`.
