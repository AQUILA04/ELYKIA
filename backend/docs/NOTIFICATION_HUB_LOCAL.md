# Notification Hub en local (profil ELYKIA `francis`)

Connexion **directe** sans OAuth2 : le hub tourne avec le profil Spring `local`
(`permit-local` + JWT optionnel) ; ELYKIA envoie seulement `X-Tenant-Id` / `X-App-Id`.

## Prérequis

| Élément | Détail |
|---------|--------|
| Dépôt hub | [AQUILA04/notification-hub](https://github.com/AQUILA04/notification-hub) |
| JDK hub | **25** (API hub) |
| Docker | Postgres, Redis, Artemis, Mailpit |
| ELYKIA | profil `francis` (port **8081**) |

**Ne pas démarrer Keycloak** du compose hub : il mappe `8081` et entre en conflit
avec ELYKIA `francis`. Le mode local n’en a pas besoin.

## 1. Infra hub (sans Keycloak)

```bash
cd /chemin/vers/notification-hub
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
