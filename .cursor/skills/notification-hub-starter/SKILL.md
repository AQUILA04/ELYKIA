---
name: notification-hub-starter
description: >
  Intégration Notification Hub (OTP SMS) : toujours prioriser le starter
  sb-notification-hub-starter (propriétés + appels de service), jamais recoder
  le client HTTP. À utiliser dès qu'on parle d'intégrer notification-hub, OTP SMS,
  NOTIFICATION_HUB_*, optimize.notification.hub.
---

# Notification Hub — starter first

## Quand appliquer

- Intégration ou migration OTP / SMS via Notification Hub
- Ajout de `NOTIFICATION_HUB_*` / `optimize.notification.hub.*`
- Remplacement de Firebase Phone Auth par le hub
- Revue d’un client HTTP maison vers le hub

## Workflow attendu

1. Ajouter la dépendance Maven/Gradle **`sb-notification-hub-starter`** (voir dépôt `AQUILA04/notification-hub`, `OTP_CLIENT_INTEGRATION.md`).
2. Configurer les propriétés uniquement (enabled, base-url, tenant/app, OAuth2, environment test|prod).
3. Injecter les **services / clients fournis par le starter** et appeler send/verify (ou API équivalente).
4. Brancher le métier (ex. `CustomerOtpService`) sur ces beans — pas sur un RestClient local.

## Ne pas faire

- Réimplémenter RestClient, TokenProvider, modèles OTP, headers `X-Tenant-Id` / Idempotency dans le projet consommateur.
- Copier-coller le package `notificationhub/` d’ELYKIA comme modèle pour un nouveau projet.

## Exception

Uniquement sur demande explicite de l’utilisateur, ou impossibilité technique **prouvée** d’utiliser le starter (version Java/Spring, artefact non publié) — alors documenter le blocage et planifier le basculement starter.
