## Connaissances du projet

*   **Nom du projet :** elykia-mobile
*   **Package ID :** com.optimize.elykia
*   **Framework :** Ionic/Angular
*   **Template :** tabs
*   **Gestionnaire de paquets :** npm
*   **Tâche TS000 (Setup du Projet) :** Terminée.
    *   Structure de dossiers créée (`core`, `features`, `models`, `shared`, `store` avec leurs sous-dossiers).
    *   `DatabaseService` créé avec le schéma SQLite.
    *   NgRx (`@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`) configuré dans `app.module.ts`.
    *   Fichiers d'environnement (`environment.ts`, `environment.prod.ts`) mis à jour avec `apiUrl` et `appName`.
    *   ESLint et Prettier configurés (`.eslintrc.json` mis à jour, `.prettierrc` créé).
    *   Dépendances installées, avec utilisation de `--legacy-peer-deps` pour résoudre un conflit de dépendance (`@capacitor/storage` vs `@capacitor/core`). Note : `@capacitor/storage` est déprécié au profit de `@capacitor/preferences`.
    *   Validation initiale (`ionic serve`) réussie dans le navigateur.

    ## Processus de développement des User Stories

Pour chaque User Story (US), le processus suivant doit être respecté :

1.  **Consulter les spécifications visuelles :** Lire le fichier `Spécifications Visuelles et Design des Écrans - Application Mobile Commerciale.md` à la racine du projet pour comprendre le design de l'US.
2.  **Analyser le prototype interactif :** Examiner le fichier HTML correspondant à l'US dans le dossier `wireflow/`. Ce fichier contient le code HTML, CSS et JS du prototype.
3.  **Adapter le prototype :** Utiliser le code du prototype comme base pour le développement de l'US dans le contexte Ionic Angular. Le fichier `wireflow/styles.css` peut être adapté pour les styles communs.
4.  **Plan d'action :** Après avoir analysé les spécifications et le prototype, créer un plan d'action détaillé avant de commencer le développement.
