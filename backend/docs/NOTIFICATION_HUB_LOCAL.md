# Notification Hub en local (profil ELYKIA `francis`)

Connexion **directe** sans OAuth2 : le hub tourne avec le profil Spring `local`
(`permit-local` + JWT optionnel) ; ELYKIA envoie seulement `X-Tenant-Id` / `X-App-Id`.

## Alignement API ELYKIA ↔ hub

| Côté | Méthode / chemin | Corps |
|------|------------------|--------|
| Hub | `POST /v1/otp/send` | `{ "to", "channel?", "environment?", "metadata?" }` → **202** |
| Hub | `POST /v1/otp/verify` | `{ "to", "code", "channel?", "sessionId?" }` → **200** |
| ELYKIA client | idem (`NotificationHubOtpClient`) | `to` E.164, `channel=SMS`, `environment=test` (francis) |
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
| ELYKIA | profil `francis` (port **8081**) |

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

## 3. ELYKIA — profil `francis`

`application-francis.yml` active déjà :

```yaml
optimize.notification.hub:
  enabled: true
  base-url: http://localhost:8088
  tenant-id: elykia
  app-id: elykia-customer-space
  environment: test
  oauth2.enabled: false
```

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=francis
```

Puis tester l’espace client : `POST /api/customer/auth/send-otp` → hub
`/v1/otp/send`.

## Rappel prod

En prod : `oauth2.enabled=true`, JWT Keycloak, `environment=prod` pour SMS réels.
Voir `OTP_CLIENT_INTEGRATION.md` dans le dépôt notification-hub.
