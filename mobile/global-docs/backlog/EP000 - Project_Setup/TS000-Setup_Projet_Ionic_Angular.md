# TS000 - Setup du Projet Ionic Angular

**Contexte :**

En tant que développeur, je souhaite mettre en place l'environnement de développement et la structure de base du projet Ionic Angular afin de pouvoir commencer le développement de l'application mobile commerciale avec une architecture solide et des bonnes pratiques.

**Description de la fonctionnalité :**

Cette Technical Story couvre la mise en place complète de l'environnement de développement, l'initialisation du projet Ionic Angular, la configuration des dépendances, la structure des dossiers, et la mise en place des outils de développement nécessaires pour l'application mobile commerciale.

**Règles Techniques :**

*   **RT-SETUP-001 :** Le projet doit être initialisé avec Ionic CLI version 7.x et Angular version 16.x minimum.
*   **RT-SETUP-002 :** La structure de dossiers doit suivre les conventions Angular et Ionic avec séparation claire des modules, services, pages et composants.
*   **RT-SETUP-003 :** SQLite doit être configuré via Capacitor pour la base de données locale.
*   **RT-SETUP-004 :** NgRx doit être configuré pour la gestion d'état de l'application.
*   **RT-SETUP-005 :** Les plugins Capacitor nécessaires doivent être installés : Camera, Geolocation, Network, Storage.
*   **RT-SETUP-006 :** Un système de configuration d'environnement (dev, staging, prod) doit être mis en place.
*   **RT-SETUP-007 :** ESLint et Prettier doivent être configurés pour maintenir la qualité du code.
*   **RT-SETUP-008 :** Les tests unitaires doivent être configurés avec Jasmine et Karma.

**Tâches Techniques :**

### 1. Installation et Initialisation

```bash
# Installation des outils globaux
npm install -g @ionic/cli @angular/cli

# Création du projet
ionic start commercial-app tabs --type=angular --capacitor

# Navigation vers le projet
cd commercial-app

# Installation des dépendances supplémentaires
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools
npm install @capacitor/sqlite @capacitor/camera @capacitor/geolocation
npm install @capacitor/network @capacitor/storage
npm install @ionic/storage-angular
```

### 2. Structure de Dossiers

```
src/
├── app/
│   ├── core/                    # Services core, guards, interceptors
│   │   ├── services/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── shared/                  # Composants, pipes, directives partagés
│   │   ├── components/
│   │   ├── pipes/
│   │   └── directives/
│   ├── features/                # Modules fonctionnels
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── distributions/
│   │   ├── recouvrements/
│   │   └── synchronisation/
│   ├── store/                   # NgRx store
│   │   ├── actions/
│   │   ├── reducers/
│   │   ├── effects/
│   │   └── selectors/
│   └── models/                  # Interfaces et modèles
├── assets/
└── environments/
```

### 3. Configuration NgRx

```typescript
// app.module.ts
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

@NgModule({
  imports: [
    StoreModule.forRoot(reducers),
    EffectsModule.forRoot([]),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production
    })
  ]
})
export class AppModule { }
```

### 4. Configuration SQLite

```typescript
// core/services/database.service.ts
import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;

  async initializeDatabase(): Promise<void> {
    try {
      this.db = await this.sqlite.createConnection('commercial_app.db', false, 'no-encryption', 1);
      await this.db.open();
      await this.createTables();
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  private async createTables(): Promise<void> {
    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        roles TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        marque TEXT,
        model TEXT,
        type TEXT,
        creditSalePrice REAL,
        stockQuantity INTEGER,
        commercialName TEXT,
        synced BOOLEAN DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        cardID TEXT,
        cardType TEXT,
        dateOfBirth TEXT,
        contactPersonName TEXT,
        contactPersonPhone TEXT,
        contactPersonAddress TEXT,
        collector TEXT,
        quarter TEXT,
        occupation TEXT,
        clientType TEXT,
        accountId INTEGER,
        latitude REAL,
        longitude REAL,
        mll TEXT,
        profilPhoto TEXT,
        synced BOOLEAN DEFAULT 0
      );
    `;
    
    await this.db?.execute(createTables);
  }
}
```

### 5. Configuration des Environnements

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
  appName: 'Commercial App Dev'
};

// environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.commercial-app.com',
  appName: 'Commercial App'
};
```

### 6. Configuration ESLint et Prettier

```json
// .eslintrc.json
{
  "root": true,
  "ignorePatterns": ["projects/**/*"],
  "overrides": [
    {
      "files": ["*.ts"],
      "extends": [
        "eslint:recommended",
        "@typescript-eslint/recommended",
        "@angular-eslint/recommended",
        "@angular-eslint/template/process-inline-templates"
      ],
      "rules": {
        "@angular-eslint/directive-selector": [
          "error",
          {
            "type": "attribute",
            "prefix": "app",
            "style": "camelCase"
          }
        ],
        "@angular-eslint/component-selector": [
          "error",
          {
            "type": "element",
            "prefix": "app",
            "style": "kebab-case"
          }
        ]
      }
    }
  ]
}
```

**Tests d'Acceptance :**

*   **TA-SETUP-001 :** **Scénario :** Projet initialisé avec succès.
    *   **Given :** L'environnement de développement est configuré.
    *   **When :** Le développeur exécute `ionic serve`.
    *   **Then :** L'application se lance sans erreur et affiche la page d'accueil par défaut.

*   **TA-SETUP-002 :** **Scénario :** Base de données locale fonctionnelle.
    *   **Given :** Le projet est configuré avec SQLite.
    *   **When :** L'application est lancée sur un appareil.
    *   **Then :** La base de données est créée et les tables sont initialisées.

*   **TA-SETUP-003 :** **Scénario :** NgRx configuré correctement.
    *   **Given :** NgRx est installé et configuré.
    *   **When :** Le développeur ouvre les DevTools Redux.
    *   **Then :** Le store NgRx est visible et fonctionnel.

**Critères de Définition de Fini (Definition of Done) :**

- [ ] Projet Ionic Angular créé et configuré
- [ ] Structure de dossiers mise en place selon les conventions
- [ ] SQLite configuré et tables créées
- [ ] NgRx installé et configuré
- [ ] Plugins Capacitor installés et configurés
- [ ] Environnements de développement configurés
- [ ] ESLint et Prettier configurés
- [ ] Tests unitaires configurés
- [ ] Documentation technique rédigée
- [ ] Application lance sans erreur en mode développement
- [ ] Build de production fonctionnel



