# Vertex AI (Gemini 3.8 Flash) — Contabo test + prod

Guide ops pour activer Elykia IA via Vertex AI sur le VPS Contabo.
Doc produit / providers : [`backend/docs/AI_ASSISTANT.md`](../backend/docs/AI_ASSISTANT.md).

**Ne jamais committer** le fichier JSON du compte de service.

## Prérequis GCP (une fois)

- Projet `elykia-503006` avec billing actif
- API **Vertex AI** (Agent Platform) activée
- Compte de service (ex. `gemini-app-user@elykia-503006.iam.gserviceaccount.com`) avec `roles/aiplatform.user`
- Modèle `gemini-3.8-flash` via endpoint **`global`** (alternatives : `us`, `eu`)

## Prérequis VPS

1. Créer le répertoire secrets :

```bash
sudo mkdir -p /opt/elykia/secrets
sudo chmod 700 /opt/elykia/secrets
```

2. Copier le SA depuis la machine locale (adapter le chemin source) :

```bash
# Depuis la machine locale (Windows / WSL / Linux)
scp /chemin/vers/elykia-503006-*.json deploy@CONTABO_HOST:/tmp/vertex-ai-sa.json

# Sur le VPS — chmod 644 requis : le conteneur tourne en user non-root et doit lire le fichier
sudo mv /tmp/vertex-ai-sa.json /opt/elykia/secrets/vertex-ai-sa.json
sudo chmod 644 /opt/elykia/secrets/vertex-ai-sa.json
sudo chown root:root /opt/elykia/secrets/vertex-ai-sa.json
```

3. Ajouter / vérifier dans `/opt/elykia/test/.env` et `/opt/elykia/prod/.env` (templates : `.env.contabo.test.example`, `.env.contabo.prod.example`) :

```env
ELYKIA_AI_ENABLED=true
ELYKIA_AI_PROVIDER=gemini
ELYKIA_AI_MODEL=gemini-3.8-flash
GOOGLE_CLOUD_PROJECT=elykia-503006
GOOGLE_CLOUD_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp/vertex-ai-sa.json
GCP_VERTEX_SA_PATH=/opt/elykia/secrets/vertex-ai-sa.json
SPRING_AI_MODEL_CHAT=vertexai
```

> Commentaires `.env` : utiliser uniquement des tirets ASCII (`-`), pas de tiret long (`—`) — Docker Compose refuse sinon le fichier.
## Recreate backends

```bash
cd /opt/elykia/deploy

docker compose -f docker-compose.test.yml --project-name elykia-test \
  --env-file /opt/elykia/test/.env up -d backend

docker compose -f docker-compose.prod.yml --project-name elykia-prod \
  --env-file /opt/elykia/prod/.env up -d backend
```

Vérifier que le volume est monté :

```bash
docker exec elykia-test-backend ls -la /secrets/gcp/vertex-ai-sa.json
docker exec elykia-backend ls -la /secrets/gcp/vertex-ai-sa.json
```

## Smoke tests

```bash
# Health (adapter host / auth si besoin)
curl -sS https://elykia-test.amenouveve-yaveh.com/api/v1/ai/health
curl -sS https://elykia.amenouveve-yaveh.com/api/v1/ai/health
```

Attendu : `"provider":"gemini"` et modèle `gemini-3.8-flash`.

Puis dans l’UI `/ai-chat` (flag `elykiaAi` + rôles `ROLE_AI_CHAT` / `ROLE_AI_REPORT`) :

- une question **DATA** (SQL)
- une question **HOW_TO** (user guide)

## Rollback rapide

Dans le `.env` concerné :

```env
ELYKIA_AI_PROVIDER=stub
# ou ELYKIA_AI_ENABLED=false
```

Puis `docker compose ... up -d backend`.
