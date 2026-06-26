# Firebase — Espace Client (`customer-space`)

Ce document décrit la configuration Firebase pour l'app **Espace Client**, distincte de l'app commerciale [`mobile/`](../../mobile/).

## Deux projets Firebase distincts

| App | Package / usage | Fichier / config | Secret GitHub (mobile existant) |
|-----|-----------------|------------------|--------------------------------|
| **mobile** (commercial) | APK terrain | `mobile/android/app/google-services.json` | `GOOGLE_SERVICES_JSON` |
| **customer-space** (client) | Ionic Web + futur APK `com.optimize.elykia.customer` | `customer-space/google-services.json` (local, gitignored) | **`CUSTOMER_SPACE_GOOGLE_SERVICES_JSON`** |

Ne réutilisez **pas** le secret `GOOGLE_SERVICES_JSON` du mobile : les fichiers `google-services.json` sont liés à un package Android différent.

## Ce que fait le code aujourd'hui

L'authentification OTP/PIN utilise le **SDK Firebase Web** (`firebase` npm) via [`FirebaseAuthService`](../src/app/shared/services/firebase-auth.service.ts). La config est lue depuis :

```ts
environment.firebase: {
  apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
}
```

Le fichier `google-services.json` sert à :

1. **Générer** `environment.firebase` (script CI / local)
2. **Build Android natif** Capacitor (`android/app/google-services.json`) quand le dossier `android/` existe

## Backend (vérification du token OTP)

Le serveur Spring valide le `firebaseIdToken` avec le **compte de service** Firebase Admin — **pas** le `google-services.json` client :

| Variable serveur | Rôle |
|------------------|------|
| `FIREBASE_ENABLED=true` | Active la vérification |
| `FIREBASE_CREDENTIALS=/chemin/vers/service-account.json` | Clé privée Admin SDK |

Ce fichier s'obtient dans Firebase Console → **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée**. Ce n'est **pas** le « jeton de test » de la page Vérification téléphone.

## Secrets GitHub à créer

### Obligatoire pour build prod CI

| Secret | Contenu |
|--------|---------|
| **`CUSTOMER_SPACE_GOOGLE_SERVICES_JSON`** | Contenu **intégral** du fichier `google-services.json` de l'app Espace Client (projet Firebase dédié, package `com.optimize.elykia.customer`) |

Dans GitHub : **Settings → Secrets and variables → Actions → New repository secret**.

Collez le JSON minifié ou formaté ; le workflow et le script le parsent tel quel.

### Optionnel (recommandé pour Phone Auth navigateur)

| Secret | Contenu |
|--------|---------|
| **`CUSTOMER_SPACE_FIREBASE_WEB_CONFIG`** | Objet JSON Web SDK depuis Firebase Console → Ajouter une app → **Web** |

Exemple :

```json
{
  "apiKey": "AIza...",
  "authDomain": "elykia-customer.firebaseapp.com",
  "projectId": "elykia-customer",
  "storageBucket": "elykia-customer.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef"
}
```

Si ce secret est défini, il **prime** sur la conversion depuis `google-services.json` (meilleur pour reCAPTCHA / domaines autorisés en navigateur).

## Pipeline CI

Fichier : [`.github/workflows/ci-customer-space.yml`](../../.github/workflows/ci-customer-space.yml)

| Job | Firebase requis ? |
|-----|-------------------|
| `test-customer-space` (unit + E2E) | **Non** — build `e2e` avec Firebase mocké (`window.__E2E__`) |
| `build-customer-space-prod` (push uniquement) | **Oui** — injecte les secrets puis `ng build --configuration=production` |

Étapes build prod :

1. `node scripts/apply-firebase-config.mjs --profile prod`
2. `npm run build -- --configuration=production`

Sans secret, le job de build passe mais affiche un avertissement et compile avec `firebase` vide (OTP désactivé en prod).

## Configuration locale

1. Placez votre fichier à la racine du module :

   ```
   customer-space/google-services.json
   ```

   (fichier **gitignored** — ne pas committer)

2. Injectez la config :

   ```bash
   cd customer-space
   npm run firebase:configure        # → environment.prod.ts
   npm run firebase:configure:dev  # → environment.ts (dev local)
   ```

3. Vérifiez dans la console Firebase :

   - **Authentication → Sign-in method → Phone** activé
   - **Authentication → Settings → Authorized domains** : `localhost` + domaine de prod
   - Numéros de test OTP si besoin (dev)

4. Build Android (après `npx cap add android`) :

   ```bash
   npm run firebase:configure
   ionic build
   npx cap sync android
   ```

## Jeton de test (console Firebase)

La page **Vérification du numéro de téléphone → Jeton de test** sert aux tests **client natifs** (Play Services), pas à `FIREBASE_CREDENTIALS` ni aux secrets GitHub ci-dessus.

## Récapitulatif des noms de secrets

| Secret | Où | Usage |
|--------|-----|-------|
| `GOOGLE_SERVICES_JSON` | GitHub Actions | App **mobile** commerciale uniquement |
| **`CUSTOMER_SPACE_GOOGLE_SERVICES_JSON`** | GitHub Actions | App **customer-space** (build prod / futur APK) |
| **`CUSTOMER_SPACE_FIREBASE_WEB_CONFIG`** | GitHub Actions (optionnel) | Config Web SDK dédiée navigateur |
| `FIREBASE_CREDENTIALS` | Serveur backend (env, pas GitHub client) | Compte de service Admin SDK |
