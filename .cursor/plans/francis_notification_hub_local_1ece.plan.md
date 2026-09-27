# Plan — Notification Hub local (profil francis)

## Objectif

Activer Notification Hub pour le profil Spring `francis` en connexion directe
(`X-Tenant-Id`, sans OAuth2) et documenter le démarrage du hub en local.

## Décisions

- `optimize.notification.hub.enabled=true` dans `application-francis.yml`
- `oauth2.enabled=false` + `tenant-id=elykia` + `environment=test`
- Hub : profil Spring `local` (JWT optionnel) — ne pas démarrer Keycloak (conflit port 8081)
- OTP SMS test → provider internal côté hub (pas de Twilio requis)

## Livrables

- [x] `backend/src/main/resources/application-francis.yml`
- [x] `backend/docs/NOTIFICATION_HUB_LOCAL.md`
- [x] Renvoi depuis `customer-space/docs/FIREBASE_SETUP.md`
- [x] Changelog Backend patch
