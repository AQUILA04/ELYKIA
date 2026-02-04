# Cross-Installation File Persistence - Requirements

## Overview
L'application mobile Ionic/Capacitor doit pouvoir accéder aux fichiers de sauvegarde (backup) créés par des versions précédentes de l'application, même après désinstallation/réinstallation de l'APK.

## Problem Statement
Actuellement, la méthode `findAllBackupFiles()` dans `DatabaseService` ne peut lire que les fichiers créés par l'instance actuelle de l'application. Bien que les fichiers soient stockés dans `Documents/elykia/` et persistent physiquement après désinstallation/réinstallation, l'application ne peut pas accéder aux fichiers créés par des versions précédentes à cause des restrictions de propriété de fichiers Android.

## User Stories

### US001: Accès aux fichiers de backup existants
**En tant qu'** utilisateur de l'application mobile
**Je veux** pouvoir accéder à mes fichiers de sauvegarde même après avoir réinstallé l'application
**Afin de** restaurer mes données sans perdre mes backups précédents

**Acceptance Criteria:**
- AC001.1: L'application peut lire tous les fichiers `.sql` dans le dossier `Documents/elykia/`, même ceux créés par des versions précédentes
- AC001.2: Les fichiers de backup restent accessibles après désinstallation/réinstallation
- AC001.3: L'application utilise les bonnes permissions et méthodes d'accès aux fichiers
- AC001.4: Un message d'erreur clair est affiché si l'accès aux fichiers échoue

### US002: Stockage persistant des backups
**En tant qu'** utilisateur
**Je veux** que mes fichiers de backup soient stockés dans un emplacement persistant
**Afin de** ne pas les perdre lors des mises à jour d'application

**Acceptance Criteria:**
- AC002.1: Les nouveaux backups sont sauvegardés avec des permissions permettant l'accès par des réinstallations futures
- AC002.2: Le dossier de backup `Documents/elykia/` est utilisé de manière cohérente
- AC002.3: Les fichiers ont des permissions de lecture appropriées
- AC002.4: La méthode de création de fichiers est optimisée pour la persistance cross-installation

### US003: Gestion des permissions Android
**En tant que** développeur
**Je veux** implémenter une gestion robuste des permissions de stockage
**Afin de** assurer la compatibilité avec différentes versions d'Android

**Acceptance Criteria:**
- AC003.1: Support d'Android 10+ (Scoped Storage)
- AC003.2: Support des versions antérieures d'Android
- AC003.3: Demande de permissions `READ_EXTERNAL_STORAGE` et `WRITE_EXTERNAL_STORAGE`
- AC003.4: Fallback vers le stockage privé si les permissions sont refusées

## Technical Requirements

### TR001: Capacitor Plugins
- Utiliser `@capacitor/filesystem` avec `Directory.Documents` ou `Directory.ExternalStorage`
- Implémenter `@capacitor-community/file-picker` pour la sélection manuelle de fichiers
- Ajouter les permissions nécessaires dans `android/app/src/main/AndroidManifest.xml`

### TR002: Stratégie de Migration
- Détecter les fichiers dans l'ancien emplacement (stockage privé)
- Proposer de copier vers le nouveau dossier public
- Maintenir la compatibilité avec les deux emplacements

### TR003: Gestion d'Erreurs
- Gérer les cas où les permissions sont refusées
- Fournir des alternatives (sélection manuelle de fichiers)
- Logger les erreurs pour le debugging

## Out of Scope
- Synchronisation cloud des fichiers de backup
- Chiffrement des fichiers de backup
- Compression automatique des backups

## Dependencies
- `@capacitor/filesystem`
- `@capacitor-community/file-picker` (optionnel)
- Permissions Android appropriées

## Risks and Mitigations
- **Risque**: Changements de politique Android sur l'accès aux fichiers
  **Mitigation**: Implémenter plusieurs stratégies de stockage
- **Risque**: Permissions refusées par l'utilisateur
  **Mitigation**: Fournir des alternatives et des explications claires