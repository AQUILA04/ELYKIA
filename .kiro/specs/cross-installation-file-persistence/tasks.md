# Cross-Installation File Persistence - Implementation Tasks

## Phase 1: Investigation et Diagnostic

### 1.1 Analyse du Problème Actuel
- [x] Analyser le code actuel de `findAllBackupFiles()` pour comprendre les limitations
- [x] Tester l'accès aux fichiers créés par différentes installations
- [x] Documenter les erreurs spécifiques rencontrées lors de l'accès aux fichiers
- [x] Vérifier les permissions actuelles dans AndroidManifest.xml

### 1.2 Recherche de Solutions Techniques
- [ ] Investiguer l'utilisation de MediaStore API pour accéder aux fichiers
- [ ] Tester Storage Access Framework (SAF) comme alternative
- [ ] Évaluer les plugins Capacitor disponibles pour l'accès aux fichiers
- [ ] Documenter les approches possibles avec leurs avantages/inconvénients

## Phase 2: Solution MediaStore/SAF

### 2.1 Plugin Installation et Configuration
- [x] Installer `@capacitor-community/media` ou plugin similaire pour MediaStore
- [ ] Configurer les permissions nécessaires pour MediaStore
- [ ] Tester l'accès MediaStore sur différentes versions Android
- [ ] Documenter les limitations de chaque approche

### 2.2 Implémentation MediaStore Access
- [x] Créer une méthode `queryBackupFilesViaMediaStore()`
- [ ] Implémenter la requête MediaStore pour les fichiers .sql dans Documents/elykia/
- [ ] Ajouter la gestion des erreurs et des cas limites
- [ ] Tester l'accès aux fichiers créés par des installations précédentes

### 2.3 Implémentation Storage Access Framework (SAF)
- [ ] Créer une méthode `requestDirectoryAccessViaSAF()`
- [ ] Implémenter la demande d'accès persistant au dossier elykia
- [ ] Créer la logique de lecture des fichiers via SAF
- [ ] Sauvegarder les permissions d'accès pour les utilisations futures

## Phase 3: Modification du DatabaseService

### 3.1 Refactoring de findAllBackupFiles()
- [x] Modifier `findAllBackupFiles()` pour utiliser MediaStore en priorité
- [ ] Ajouter un fallback vers SAF si MediaStore échoue
- [ ] Implémenter un fallback vers File Picker en dernier recours
- [ ] Maintenir la compatibilité avec l'approche actuelle comme backup

### 3.2 Amélioration de saveBackupToFile()
- [ ] S'assurer que les nouveaux fichiers sont créés avec les bonnes permissions
- [ ] Tester que les fichiers créés sont accessibles après réinstallation
- [ ] Ajouter des métadonnées aux fichiers pour faciliter l'identification
- [ ] Implémenter une vérification post-création

### 3.3 Mise à jour des autres méthodes
- [ ] Modifier `findLatestBackupFile()` pour utiliser les nouvelles méthodes d'accès
- [x] Adapter `restoreFromBackup()` pour gérer les différents types d'accès aux fichiers
- [ ] Mettre à jour la gestion d'erreurs dans toutes les méthodes concernées

## Phase 4: Interface Utilisateur et Expérience

### 4.1 Gestion des Permissions Utilisateur
- [ ] Créer des dialogues explicatifs pour les permissions MediaStore
- [ ] Implémenter la demande d'accès SAF avec instructions claires
- [ ] Ajouter des messages d'aide pour guider l'utilisateur
- [ ] Créer un système de retry intelligent

### 4.2 File Picker de Secours
- [x] Intégrer `@capacitor-community/file-picker` comme solution de dernier recours
- [ ] Créer une interface pour la sélection manuelle de fichiers
- [ ] Ajouter la validation des fichiers sélectionnés manuellement
- [ ] Implémenter la sauvegarde des préférences d'accès

### 4.3 Amélioration de l'Interface de Backup
- [ ] Afficher la source d'accès des fichiers (MediaStore/SAF/FilePicker)
- [ ] Ajouter des indicateurs de statut d'accès aux fichiers
- [ ] Créer des options de diagnostic pour les problèmes d'accès
- [ ] Implémenter des messages d'erreur contextuels

## Phase 5: User Experience Improvements

### 5.1 Settings Integration
- [ ] Add storage preference options to app settings
- [ ] Create storage location display in settings
- [ ] Add manual migration trigger in settings
- [ ] Implement storage usage statistics

### 5.2 Backup Management UI
- [ ] Enhance backup list display with file locations
- [ ] Add file source indicators (private/public storage)
- [ ] Implement backup file management (delete, rename)
- [ ] Add backup verification tools

## Phase 6: Testing and Validation

### 6.1 Unit Tests
- [ ] Test permission checking logic
- [ ] Test file path resolution methods
- [ ] Test error handling scenarios
- [ ] Test migration logic

### 6.2 Integration Tests
- [ ] Test cross-installation file access
- [ ] Test migration from private to public storage
- [ ] Test permission request flows
- [ ] Test fallback mechanisms

### 6.3 Property-Based Tests
- [ ] **Property 1**: File Persistence Across Installations
  - **Validates**: Requirements AC001.1, AC001.2
  - Test that backup files remain accessible after app reinstallation
- [ ] **Property 2**: Permission Graceful Degradation
  - **Validates**: Requirements AC001.4, AC003.4
  - Test that app functions with reduced capabilities when permissions denied
- [ ] **Property 3**: Migration Completeness
  - **Validates**: Requirements AC002.4
  - Test that all legacy files are successfully migrated

### 6.4 Manual Testing
- [ ] Test on Android 6-8 (runtime permissions)
- [ ] Test on Android 9 (external storage changes)
- [ ] Test on Android 10+ (scoped storage)
- [ ] Test install → backup → uninstall → reinstall → restore flow
- [ ] Test permission denial and recovery scenarios

## Phase 7: Documentation and Deployment

### 7.1 Documentation Updates
- [ ] Update README with new backup behavior
- [ ] Document storage requirements and permissions
- [ ] Create troubleshooting guide for file access issues
- [ ] Update API documentation for modified methods

### 7.2 Deployment Preparation
- [ ] Update app version and changelog
- [ ] Prepare migration notes for existing users
- [ ] Create rollback plan for deployment issues
- [ ] Test on production-like environment

## Dependencies and Prerequisites

### Required Packages
- `@capacitor/filesystem` (already installed)
- `@capacitor-community/file-picker` (to be installed)

### Android Configuration
- Minimum SDK version compatibility check
- Target SDK version updates if needed
- Proguard rules for file operations

### Testing Requirements
- Physical Android devices for testing
- Different Android versions (6, 8, 10, 11+)
- Test APK signing for production behavior

## Risk Mitigation

### High Priority Risks
1. **Android version compatibility issues**
   - Mitigation: Extensive testing on multiple Android versions
   - Fallback: Maintain private storage as backup option

2. **User permission denial**
   - Mitigation: Clear explanations and alternative methods
   - Fallback: File picker for manual selection

3. **Migration data loss**
   - Mitigation: Copy (don't move) files during migration
   - Fallback: Keep original files until migration confirmed

### Medium Priority Risks
1. **Performance impact on large file sets**
   - Mitigation: Implement lazy loading and progress indicators
   
2. **Storage space limitations**
   - Mitigation: Add storage usage monitoring and cleanup options