# Firebase — Espace Client (`customer-space`)

Ce document décrit la configuration Firebase pour l'app **Espace Client**, distincte de l'app commerciale [`mobile/`](../../mobile/).

## Rôle actuel de Firebase

| Usage | Statut |
|-------|--------|
| **OTP / Phone Auth SMS** | **Supprimé** — les SMS OTP passent par **Notification Hub** via le backend ELYKIA (`POST /api/customer/auth/send-otp` + `verify-otp`) |
| **Remote Config** (`customerSpaceAvailable`) | Conservé — [`FeatureFlagService`](../src/app/shared/services/feature-flag.service.ts) |
| **Crashlytics** (crashs natifs + erreurs non fatales) | APK Android via `@capacitor-firebase/crashlytics` |
| **Analytics** (événements d'usage) | APK + Web (SDK JS si `measurementId` présent) |
| **Journal d'activité backend** | Table `customer_activity_log` + `POST /api/customer/auth/activity-logs` |

## Deux projets Firebase distincts

| App | Package / usage | Fichier / config | Secret GitHub |
|-----|-----------------|------------------|---------------|
| **mobile** (commercial) | APK terrain | `mobile/android/app/google-services.json` | `GOOGLE_SERVICES_JSON` |
| **customer-space** (client) | Ionic Web + APK `com.optimize.elykia.customer` | `customer-space/google-services.json` (local, gitignored) | **`CUSTOMER_SPACE_GOOGLE_SERVICES_JSON`** |

Ne réutilisez **pas** le secret `GOOGLE_SERVICES_JSON` du mobile.

## Prérequis console Firebase (projet Espace Client)

1. Activer **Crashlytics** et **Google Analytics**.
2. Vérifier que l'app Android a le package `com.optimize.elykia.customer` et que `CUSTOMER_SPACE_GOOGLE_SERVICES_JSON` correspond.
3. Ajouter `measurementId` (G-…) dans `CUSTOMER_SPACE_FIREBASE_WEB_CONFIG` pour Analytics web.
4. Les builds APK appellent `.github/scripts/configure-android-firebase.sh` après `cap sync` (plugin Crashlytics Gradle + BOM).

## Config Web SDK (Remote Config + Analytics)

La config est lue depuis un fichier **local gitignored** :

```ts
// src/environments/firebase.config.local.ts (généré, ne pas committer)
firebaseConfigLocal: { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId? }
```

Les fichiers `environment.ts` / `environment.prod.ts` importent cette config via `firebase-config.ts` — **aucun secret Firebase n'est versionné**.

Scripts :

```bash
npm run firebase:configure:dev   # génère la config locale
npm run firebase:configure       # profil prod
```

## Corrélation et journal

Chaque événement porte `deviceId` (persistant), `sessionId` (par lancement), `clientId` (après login) et le téléphone (complet côté backend, masqué `+2289****1234` côté Firebase).

L'app envoie aussi les en-têtes `X-Elykia-Device-Id`, `X-Elykia-Session-Id` et `X-Request-Id` ; le backend les place dans le MDC des logs serveur.

**Limite Crashlytics** : les breadcrumbs ne sont visibles que s'ils sont attachés à un crash ou à une erreur non fatale. Pour le parcours complet (connexion → actions) :

1. Console Firebase → Crashlytics → filtrer par `userId` = `clientId`.
2. Console Firebase → Analytics → DebugView / événements (user_id = `clientId`).
3. Backend → `GET /api/v1/customer-activity-logs?clientId=&phone=&deviceId=&sessionId=&from=&to=` (utilisateur authentifié admin/staff).
4. Elykia IA (DATA) : table `customer_activity_log` (synonymes « journal client », « activité espace client »).

## OTP SMS — Notification Hub (backend)

L'espace client n'appelle **plus** Firebase Phone Auth. Flux :

1. `POST /api/customer/auth/send-otp` → backend → Notification Hub `POST /v1/otp/send`
2. `POST /api/customer/auth/verify-otp` → backend → Hub `POST /v1/otp/verify` → jeton de preuve HMAC
3. `POST /api/customer/auth/setup-pin` avec `otpProofToken` (plus de `firebaseIdToken`)

Variables serveur ELYKIA (voir `backend` `application.yml`) :

| Variable | Rôle |
|----------|------|
| `NOTIFICATION_HUB_ENABLED=true` | Active le client OTP |
| `NOTIFICATION_HUB_BASE_URL` | URL API hub (prod : `https://notification-api.optimizesolux.com`) |
| `NOTIFICATION_HUB_TENANT_ID` | Tenant local (`X-Tenant-Id`) si OAuth2 off |
| `NOTIFICATION_HUB_OAUTH2_ENABLED` | Client credentials Keycloak (prod) |
| `NOTIFICATION_HUB_CLIENT_ID` / `NOTIFICATION_HUB_CLIENT_SECRET` | Service account hub |
| `NOTIFICATION_HUB_TOKEN_URI` | Token Keycloak realm `notification-hub` |
| `NOTIFICATION_HUB_ENVIRONMENT` | `test` (email recette) ou `prod` (SMS réel) ; vide = dérivé du profil Spring |
| `CUSTOMER_ACTIVITY_LOG_RETENTION_DAYS` | Rétention journal activité (défaut 180) |

Guide d'intégration : dépôt `AQUILA04/notification-hub` → `backend/docs/OTP_CLIENT_INTEGRATION.md`.

## Secrets GitHub (Remote Config / APK)

| Secret | Contenu |
|--------|---------|
| **`CUSTOMER_SPACE_GOOGLE_SERVICES_JSON`** | `google-services.json` Espace Client |
| **`CUSTOMER_SPACE_FIREBASE_WEB_CONFIG`** | JSON Web SDK (Remote Config + `measurementId` Analytics) |

Les tests CI (unit + E2E) désactivent la télémétrie (`telemetryEnabled: false` en e2e) ; OTP mocké via interception API / `window.__E2E__`.
