# Guide de Build Android pour l'Application Elykia Mobile

Ce document décrit les étapes nécessaires pour compiler, builder et tester l'application sur un appareil ou un émulateur Android en utilisant Capacitor.

## 1. Prérequis

Avant de commencer, assurez-vous que les outils suivants sont installés et configurés sur votre machine de développement :

- **Node.js et npm :** Assurez-vous d'avoir une version LTS de Node.js.
- **Ionic CLI :** Si ce n'est pas déjà fait, installez-le globalement :
  ```sh
  npm install -g @ionic/cli
  ```
- **Java Development Kit (JDK) :** Une version 11 ou 17 est recommandée pour le développement Android moderne.
- **Android Studio :** Installez la dernière version d'Android Studio. Cela inclut le SDK Android, les outils de ligne de commande (`adb`) et la gestion des émulateurs.
- **Configuration de l'environnement :** Assurez-vous que la variable d'environnement `ANDROID_HOME` (ou `ANDROID_SDK_ROOT`) est définie et pointe vers le répertoire de votre SDK Android.

---

## 2. Étapes pour le Build

Toutes les commandes suivantes doivent être exécutées depuis le répertoire du projet mobile : `elykia-mobile/`.

### Étape 2.1 : Installation des dépendances

Assurez-vous que toutes les dépendances du projet sont à jour.

```sh
npm install
```

### Étape 2.2 : Ajout de la plateforme Android (Première fois uniquement)

Si c'est la toute première fois que vous buildez pour Android, vous devez ajouter la plateforme à votre projet Capacitor.

```sh
npx cap add android
```

### Étape 2.3 : Build des fichiers web

Compilez votre application Angular/Ionic en fichiers web statiques. Cette commande place le résultat dans le dossier `www/`.

```sh
ionic build
```

### Étape 2.4 : Synchronisation avec Capacitor

Copiez les fichiers web buildés (du dossier `www/`) dans votre projet natif Android. Cette commande met également à jour les plugins et dépendances natives.

```sh
npx cap sync android
```

---

## 3. Test de l'APK de Débogage

Une fois les étapes de build terminées, vous avez deux méthodes principales pour installer et tester l'application.

### Méthode A : Utiliser Android Studio (Recommandé)

C'est la méthode la plus simple et la plus complète, car elle vous donne accès aux logs (`Logcat`), aux outils de débogage et à une gestion simplifiée.

1.  **Ouvrez le projet natif dans Android Studio :**
    ```sh
    npx cap open android
    ```

2.  **Patientez pendant la synchronisation de Gradle :** Android Studio va indexer les fichiers et synchroniser le projet avec Gradle. Cela peut prendre quelques minutes la première fois.

3.  **Sélectionnez un appareil :** En haut de la fenêtre d'Android Studio, choisissez un appareil cible. Il peut s'agir d'un émulateur que vous avez configuré ou d'un appareil physique connecté en USB (avec le mode développeur et le débogage USB activés).

4.  **Lancez l'application :** Cliquez sur le bouton "Run 'app'" (l'icône de lecture verte ▶️). Android Studio va compiler le code natif, générer un APK de débogage, l'installer sur l'appareil cible et le lancer automatiquement.

### Méthode B : Générer et Installer l'APK manuellement

Cette méthode est utile pour partager rapidement un APK de test sans passer par Android Studio.

1.  **Naviguez dans le dossier Android :**
    ```sh
    cd android
    ```

2.  **Lancez le build Gradle :**
    - Sur Windows :
      ```sh
      gradlew.bat assembleDebug
      ```
    - Sur macOS/Linux :
      ```sh
      ./gradlew assembleDebug
      ```

3.  **Trouvez l'APK :** Le fichier `app-debug.apk` sera généré dans le répertoire :
    `elykia-mobile/android/app/build/outputs/apk/debug/`

4.  **Installez l'APK sur un appareil :** Avec un appareil connecté, utilisez l'outil `adb` (inclus avec le SDK Android) pour l'installer :
    ```sh
    adb install app/build/outputs/apk/debug/app-debug.apk
    ```

L'application "elykia" apparaîtra alors dans la liste des applications de votre appareil.
