# Notification Hub en local

Connexion **directe** sans OAuth2 : le hub tourne avec le profil Spring `local`
(`permit-local` + JWT optionnel) ; ELYKIA envoie seulement `X-Tenant-Id` / `X-App-Id`.

## Alignement API ELYKIA ↔ hub

| Côté | Méthode / chemin | Corps |
|------|------------------|--------|
| Hub | `POST /v1/otp/send` | `{ "to", "channel?", "environment?", "metadata?" }` → **202** |
| Hub | `POST /v1/otp/verify` | `{ "to", "code", "channel?", "sessionId?" }` → **200** |
| ELYKIA client | idem (`NotificationHubOtpClient`) | `to` E.164, `channel=SMS`, `environment=test` |
| Headers (local) | `X-Tenant-Id`, `X-App-Id`, `Idempotency-Key` (send) | **pas** de Bearer |

Autres routes hub utiles pour diagnostiquer : `GET /actuator/health`,
`GET /v1/channels`, `POST /v1/notifications`.

Un **HTTP 404** sur `/v1/otp/send` alors que le hub répond ailleurs signifie presque
toujours un **binaire hub trop ancien** (module OTP absent) : `git pull` sur `main`
puis rebuild / relancer. Les chemins ELYKIA sont déjà alignés sur le contrat actuel.

### Diagnostic rapide (machine locale)

```bash
curl -s http://localhost:8088/actuator/health
curl -s http://localhost:8088/v1/channels -H "X-Tenant-Id: elykia"
curl -si -X POST http://localhost:8088/v1/otp/send \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: elykia" \
  -H "X-App-Id: elykia-customer-space" \
  -d '{"to":"+22870155169","channel":"SMS","environment":"test"}'
```

| Résultat | Interprétation |
|----------|----------------|
| health KO / connection refused | Hub non démarré ou mauvais port |
| channels OK, otp **404** | Hub sans module OTP → update `main` + relancer profil `local` |
| otp **401** | Profil non-`local` (JWT requis) — utiliser `-Dspring-boot.run.profiles=local` |
| otp **202** | OK — Mailpit http://localhost:8025 pour le code en `environment=test` |

## Prérequis

| Élément | Détail |
|---------|--------|
| Dépôt hub | [AQUILA04/notification-hub](https://github.com/AQUILA04/notification-hub) **branche `main` à jour** |
| JDK hub | **25** (API hub) |
| Docker | Postgres, Redis, Artemis, Mailpit |
| ELYKIA | profil `local` (port **8081**), voir `application-local.yml.example` |

**Ne pas démarrer Keycloak** du compose hub : il mappe `8081` et entre en conflit
avec ELYKIA `francis`. Le mode local n’en a pas besoin.

## 1. Infra hub (sans Keycloak)

```bash
cd /chemin/vers/notification-hub
git checkout main && git pull
cp -n .env.example .env
# Optionnel pour OTP SMS sans Twilio : SMS_PROVIDER=logging (déjà le défaut compose api)
docker compose up -d postgres redis artemis mailpit
```

Ports utiles : Postgres `5433`, Redis `6380`, Artemis `61616`, Mailpit UI
http://localhost:8025 (SMTP `1025`).

## 2. API hub — profil `local`

```bash
cd backend
export POSTGRES_PORT=5433
export REDIS_PORT=6380
export SMTP_PORT=1025
# OTP test sans Twilio Verify : environment=test côté client → provider internal
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

- API : http://localhost:8088  
- Health : http://localhost:8088/actuator/health  

Smoke (sans Bearer) :

```bash
curl -s -X POST http://localhost:8088/v1/otp/send \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: elykia" \
  -H "X-App-Id: elykia-customer-space" \
  -d '{"to":"+22890123456","channel":"SMS","environment":"test"}'
```

Avec `environment=test`, le hub **n’envoie pas** de SMS réel : code généré en
interne + copie email vers Mailpit / `sms@optimizesolux.com`.

Alternative tout-Docker (toujours sans Keycloak) :

```bash
docker compose --profile app up -d --build api
# SPRING_PROFILES_ACTIVE=local dans le compose
```

## 3. ELYKIA — poste local

Le profil personnel `francis` n’est pas versionné (`.gitignore`). Copier
`application-local.yml.example` vers `application-local.yml` : le bloc
`optimize.notification.hub` y active déjà le hub local sans OAuth
(`environment: test`).

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Le profil `prod` exige `NOTIFICATION_HUB_CLIENT_SECRET` (OAuth2 activé).
Sans hub : `NOTIFICATION_HUB_ENABLED=false`.

Puis tester l’espace client : `POST /api/customer/auth/send-otp` → hub
`/v1/otp/send`.

## Production (Contabo)

Elykia n’envoie pas le SMS. Il appelle le hub. Le message
« L'envoi SMS OTP n'est pas activé sur ce serveur (Notification Hub). »
signifie `optimize.notification.hub.enabled=false`
(`NOTIFICATION_HUB_ENABLED` absent ou `false`).

Défaut Elykia (profil `prod`, compose Contabo) : activé, OAuth2 activé,
`environment` vide → le client envoie `prod` (SMS réel). La stack test force
`NOTIFICATION_HUB_ENVIRONMENT=test` (copie e-mail, pas de SMS).

Sans `NOTIFICATION_HUB_CLIENT_SECRET`, le backend **ne démarre pas**.

### Variables Elykia (`/opt/elykia/prod/.env`)

| Nom | Valeur attendue |
|-----|-----------------|
| `NOTIFICATION_HUB_ENABLED` | `true` |
| `NOTIFICATION_HUB_BASE_URL` | `http://notification-hub-prod-api-1:8088` (réseau `optimizesolux-common`). Secours public : `https://notification-api.optimizesolux.com` |
| `NOTIFICATION_HUB_TENANT_ID` | `elykia` (secours local ; en prod le tenant vient du JWT) |
| `NOTIFICATION_HUB_APP_ID` | `elykia-customer-space` |
| `NOTIFICATION_HUB_ENVIRONMENT` | vide en prod (dérivé → `prod`). `test` sur la stack de recette |
| `NOTIFICATION_HUB_OAUTH2_ENABLED` | `true` |
| `NOTIFICATION_HUB_TOKEN_URI` | `https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token` |
| `NOTIFICATION_HUB_CLIENT_ID` | `elykia` |
| `NOTIFICATION_HUB_CLIENT_SECRET` | secret du client Keycloak, hors git |
| `NOTIFICATION_HUB_PROOF_SECRET` | optionnel (sinon dérivé de `JWT_SECRET`) |

L’hôte `notification-auth.optimizesolux.com` cité dans un exemple du guide hub
n’est pas l’auth Contabo. L’issuer réel est `auth.optimizesolux.com`.

Contrat appelé : `POST /v1/otp/send` puis `POST /v1/otp/verify`, Bearer,
`Idempotency-Key` sur send, corps `{ "to": "+228…", "channel": "SMS", "environment": "prod" }`.

### Côté notification-hub (ne pas le faire dans ce dépôt)

Realm Keycloak `notification-hub` sur `auth.optimizesolux.com`
(`optimize-common-infra`). Client confidentiel **`elykia`** :

- Service account activé, flux navigateur coupés
- Rôle realm `notification-sender`
- Claim access token `tenant_id` = `elykia` (hardcoded claim)
- Audience `notification-hub-api` recommandée

API hub (`notification-hub-prod`, service `api`, port 8088) :

| Nom | Rôle |
|-----|------|
| `OTP_ENABLED` | `true` |
| `OTP_DEFAULT_CHANNEL` | `SMS` |
| `OTP_PROVIDER` | `twilio-verify` (défaut) **ou** `internal` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | requis si `twilio-verify` (SID `VA…`). Pas de template SMS à créer : Twilio rédige le message |
| `SMS_PROVIDER`, `BREVO_API_KEY`, `SMS_DEFAULT_FROM` | requis si `OTP_PROVIDER=internal` et SMS réel (`environment=prod`) |
| `OTP_SMS_BODY_TEMPLATE` | seulement pour `internal` : garder `{{code}}` et `{{reference}}` |

Un `environment` autre que `prod` n’envoie pas de SMS : copie e-mail vers la liste
SMS test du hub (défaut `sms@optimizesolux.com`). Compte Twilio Trial : le numéro
destinataire doit être vérifié dans la console Twilio.
