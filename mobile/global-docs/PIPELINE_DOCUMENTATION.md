# Documentation du Pipeline GitHub Actions - Elykia Mobile

## Vue d'ensemble

Ce document décrit le pipeline GitHub Actions créé pour automatiser la génération d'APK debug de l'application Elykia Mobile.

## Fichier de Workflow

**Emplacement :** `.github/workflows/build-android-debug.yml`

## Déclencheurs

Le pipeline se déclenche automatiquement dans les cas suivants :
- **Push** sur la branche `main`
- **Pull Request** vers la branche `main`

## Étapes du Pipeline

### 1. Configuration de l'environnement
- **OS :** Ubuntu Latest
- **Node.js :** Version 20 avec cache npm (mis à jour pour compatibilité Angular CLI)
- **Java :** OpenJDK 21 (Temurin) - mis à jour pour compatibilité Android
- **Android SDK :** Configuration automatique

### 2. Installation des dépendances
- **Nettoyage du cache npm :** `npm cache clean --force`
- **Installation des dépendances :** `npm install --legacy-peer-deps` (pour résoudre les conflits de versions Capacitor)
- **Installation globale d'Ionic CLI**
- **Installation globale de Capacitor CLI :** `@capacitor/cli` (requis pour les commandes cap)
- **Répertoire de travail :** `./elykia-mobile`
- **Fichier .npmrc :** Configuré avec `legacy-peer-deps=true` pour gérer les conflits de dépendances

### 3. Build de l'application
- **Build Ionic :** `ionic build --prod`
- **Ajout plateforme Android :** `npx cap add android` (si nécessaire)
- **Synchronisation Capacitor :** `npx cap sync android`

### 4. Génération de l'APK
- Attribution des permissions d'exécution à `gradlew`
- Build de l'APK debug : `./gradlew assembleDebug`
- Répertoire de sortie : `elykia-mobile/android/app/build/outputs/apk/debug/`

### 5. Publication des artefacts
- **Artefact principal :** `elykia-mobile-debug-apk` (rétention 30 jours)
- **Artefact versionné :** `elykia-mobile-debug-{SHA}` (rétention 90 jours)

## Résolution des conflits de dépendances

### Problème identifié
Le projet utilise **Capacitor Core v7.4.2**, mais le plugin `@bcyesil/capacitor-plugin-printer@0.0.5` nécessite **Capacitor Core v6**. Cela créait un conflit de peer dependencies lors de l'installation.

### Solution implémentée
1. **Fichier .npmrc :** Ajout de `legacy-peer-deps=true` dans le projet
2. **Workflow modifié :** Utilisation de `npm install --legacy-peer-deps` au lieu de `npm ci`
3. **Cache npm :** Nettoyage du cache avant installation pour éviter les problèmes de cache

### Impact
- ✅ Le build fonctionne malgré le conflit de versions
- ⚠️ Attention : Le plugin printer pourrait ne pas fonctionner parfaitement avec Capacitor v7
- 💡 Recommandation : Chercher un plugin printer compatible avec Capacitor v7 pour une solution à long terme

## Corrections récentes (Historique des problèmes résolus)

### Version Java incompatible (Dernière correction)
**Problème :** "error: invalid source release: 21" lors de la compilation Gradle
**Cause :** Le projet Android est configuré pour Java 21 mais le pipeline utilisait Java 17
**Solution :** 
- Mise à jour de Java vers la version 21 dans le workflow GitHub Actions
- Utilisation d'OpenJDK 21 (Temurin distribution)

### Version Node.js et Capacitor CLI (Correction précédente)
**Problème :** Angular CLI nécessitait Node.js v20.19+ mais le pipeline utilisait v18.20.8
**Solution :** 
- Mise à jour de Node.js vers la version 20 dans le workflow
- Ajout de l'installation globale de `@capacitor/cli`
- Résolution des warnings Capacitor CLI manquant

### Conflits de dépendances Capacitor (Première correction)
**Problème :** Conflit entre `@bcyesil/capacitor-plugin-printer` (v6) et `@capacitor/core` (v7)
**Solution :** 
- Fichier `.npmrc` avec `legacy-peer-deps=true`
- Utilisation de `npm install --legacy-peer-deps`

## Téléchargement de l'APK

### Via l'interface GitHub
1. Aller sur la page du repository GitHub
2. Cliquer sur l'onglet "Actions"
3. Sélectionner le workflow "Build Android Debug APK"
4. Choisir l'exécution souhaitée
5. Télécharger l'artefact dans la section "Artifacts"

### Fichier généré
- **Nom :** `app-debug.apk`
- **Type :** APK debug Android
- **Usage :** Installation directe sur appareils de test

## Structure du projet

```
elykia-mobile/
├── .github/
│   └── workflows/
│       └── build-android-debug.yml
├── elykia-mobile/          # Code source de l'application
│   ├── src/
│   ├── android/            # Projet Android natif (généré)
│   ├── package.json
│   └── capacitor.config.ts
└── build.md               # Instructions de build manuel
```

## Prérequis pour le développement local

Référez-vous au fichier `build.md` pour les instructions de build en local :
- Node.js LTS
- Ionic CLI
- Java JDK 11/17
- Android Studio
- Variable d'environnement `ANDROID_HOME`

## Notes importantes

1. **Première exécution :** Le pipeline peut prendre plus de temps lors de la première exécution due au téléchargement des dépendances et du SDK Android.

2. **Cache :** Les dépendances npm sont mises en cache pour accélérer les builds suivants.

3. **Sécurité :** L'APK généré est en mode debug uniquement, adapté pour les tests internes.

4. **Rétention :** Les artefacts sont conservés 30-90 jours selon le type.

## Maintenance

- **Mise à jour des versions :** Modifier les versions de Node.js, Java ou Android SDK dans le workflow si nécessaire
- **Optimisation :** Ajouter des étapes de cache supplémentaires si les builds deviennent trop lents
- **Tests :** Considérer l'ajout d'étapes de tests automatisés avant le build

## Dépannage

### Erreurs communes
- **Gradle build failed :** Vérifier les dépendances dans `package.json`
- **Android SDK issues :** S'assurer que les versions sont compatibles
- **Capacitor sync errors :** Vérifier la configuration dans `capacitor.config.ts`

### Logs
Les logs détaillés sont disponibles dans l'interface GitHub Actions pour chaque exécution du workflow.

