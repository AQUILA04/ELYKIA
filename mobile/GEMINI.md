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
    
