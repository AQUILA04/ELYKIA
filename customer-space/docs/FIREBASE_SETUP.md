# Firebase — Espace Client (`customer-space`)

Ce document décrit la configuration Firebase pour l'app **Espace Client**, distincte de l'app commerciale [`mobile/`](../../mobile/).

## Rôle actuel de Firebase

| Usage | Statut |
|-------|--------|
| **OTP / Phone Auth SMS** | **Supprimé** — les SMS OTP passent par **Notification Hub** via le backend ELYKIA (`POST /api/customer/auth/send-otp` + `verify-otp`) |
| **Remote Config** (`customerSpaceAvailable`) | Conservé — [`FeatureFlagService`](../src/app/shared/services/feature-flag.service.ts) |

## Deux projets Firebase distincts

| App | Package / usage | Fichier / config | Secret GitHub |
|-----|-----------------|------------------|---------------|
| **mobile** (commercial) | APK terrain | `mobile/android/app/google-services.json` | `GOOGLE_SERVICES_JSON` |
| **customer-space** (client) | Ionic Web + APK `com.optimize.elykia.customer` | `customer-space/google-services.json` (local, gitignored) | **`CUSTOMER_SPACE_GOOGLE_SERVICES_JSON`** |

Ne réutilisez **pas** le secret `GOOGLE_SERVICES_JSON` du mobile.

## Config Web SDK (Remote Config)

La config est lue depuis un fichier **local gitignored** :

```ts
// src/environments/firebase.config.local.ts (généré, ne pas committer)
firebaseConfigLocal: { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId }
```

Les fichiers `environment.ts` / `environment.prod.ts` importent cette config via `firebase-config.ts` — **aucun secret Firebase n'est versionné**.

Scripts :

```bash
npm run firebase:configure:dev   # génère la config locale
npm run firebase:configure       # profil prod
```

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

Guide d'intégration : dépôt `AQUILA04/notification-hub` → `backend/docs/OTP_CLIENT_INTEGRATION.md`.

## Secrets GitHub (Remote Config / APK)

| Secret | Contenu |
|--------|---------|
| **`CUSTOMER_SPACE_GOOGLE_SERVICES_JSON`** | `google-services.json` Espace Client |
| **`CUSTOMER_SPACE_FIREBASE_WEB_CONFIG`** | JSON Web SDK (Remote Config) |

Les tests CI (unit + E2E) **n'utilisent pas** Firebase Phone Auth (OTP mocké via interception API / `window.__E2E__`).
