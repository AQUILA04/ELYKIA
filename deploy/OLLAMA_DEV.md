# Ollama — installation et dépannage (dev Elykia IA)

Guide pour faire tourner Ollama en local avec le module **Elykia IA** (`elykia.ai.provider=ollama`).

Documentation IA complète : [`backend/docs/AI_ASSISTANT.md`](../backend/docs/AI_ASSISTANT.md).

---

## Installation standard (Docker)

```powershell
# Depuis la racine du dépôt ELYKIA
docker compose -f deploy/docker-compose.dev.yml up -d ollama

docker exec -it elykia-dev-ollama ollama pull qwen2.5-coder:7b
docker exec -it elykia-dev-ollama ollama pull nomic-embed-text
```

| Modèle | Usage |
|--------|--------|
| `qwen2.5-coder:7b` | Chat / Text-to-SQL |
| `nomic-embed-text` | RAG vectoriel (optionnel, si `help.embedding-search-enabled: true`) |

API Ollama : `http://localhost:11434` (port configurable via `OLLAMA_PORT` dans le compose).

---

## Configuration backend

```yaml
elykia:
  ai:
    enabled: true
    provider: ollama
    model: qwen2.5-coder:7b
    help:
      embedding-search-enabled: true   # false = RAG par mots-clés uniquement
      embedding-model: nomic-embed-text

spring:
  ai:
    model:
      chat: ollama      # activé automatiquement par AiProviderEnvironmentPostProcessor
      embedding: ollama # uniquement si embedding-search-enabled: true
    ollama:
      enabled: true
      base-url: http://localhost:11434
      chat:
        options:
          model: qwen2.5-coder:7b
          temperature: 0.1
      embedding:
        options:
          model: nomic-embed-text
```

Vérification :

```http
GET /api/v1/ai/health
Authorization: Bearer <token>
```

Réponse attendue : `"provider": "ollama"`.

---

## Erreur `x509: certificate signed by unknown authority`

### Symptôme

```text
Error: pull model manifest: Get "https://registry.ollama.ai/...":
tls: failed to verify certificate: x509: certificate signed by unknown authority
```

### Cause

Sur un **réseau d'entreprise** (Zscaler, GlobalProtect, Palo Alto, proxy SSL), le trafic HTTPS est intercepté et resigné avec un certificat interne. Le **conteneur Docker** ne possède pas la CA racine de votre société dans son magasin de certificats.

Ce n'est pas un bug Elykia ni Ollama : c'est un problème de confiance TLS dans l'environnement Docker.

### Confirmer la cause

```powershell
docker exec elykia-dev-ollama sh -c "openssl s_client -connect registry.ollama.ai:443 -servername registry.ollama.ai </dev/null 2>/dev/null | openssl x509 -noout -issuer"
```

Si l'`issuer` affiche le nom de votre entreprise ou de votre proxy (et non une CA publique type DigiCert / Let's Encrypt), c'est bien une inspection SSL.

---

## Solutions

### Option A — Ollama natif Windows (recommandé)

L'installateur Windows utilise le magasin de certificats du système, souvent déjà configuré par l'IT.

```powershell
# Libérer le port 11434 si le conteneur Docker tourne
docker compose -f deploy/docker-compose.dev.yml stop ollama

# Installation : https://ollama.com/download
# ou :
winget install Ollama.Ollama

ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

Le backend Elykia pointe déjà sur `http://localhost:11434` — **aucune modification Docker** n'est nécessaire.

---

### Option B — Importer la CA entreprise dans le conteneur

1. Obtenir le certificat **racine** de votre proxy (fichier `.crt`) :
   - via le service IT, ou
   - `certmgr.msc` → **Autorités de certification racines de confiance** → exporter en `.crt`.

2. Installer la CA dans le conteneur :

```powershell
docker cp C:\chemin\vers\corporate-ca.crt elykia-dev-ollama:/usr/local/share/ca-certificates/corporate-ca.crt
docker exec -it elykia-dev-ollama update-ca-certificates
docker restart elykia-dev-ollama
```

3. Retenter le téléchargement :

```powershell
docker exec -it elykia-dev-ollama ollama pull qwen2.5-coder:7b
docker exec -it elykia-dev-ollama ollama pull nomic-embed-text
```

> **Note :** après recréation du conteneur (`docker compose down` + `up`), il faudra réimporter la CA ou monter le fichier `.crt` en volume (personnalisation locale).

---

### Option C — Continuer sans Ollama (mode stub)

Pour tester l'interface et l'API sans modèle local :

```yaml
elykia:
  ai:
    provider: stub
```

Réponses déterministes, pas de téléchargement de modèle. Voir `AI_ASSISTANT.md` → Provider stub.

---

## Commandes utiles

```powershell
# État du service
docker compose -f deploy/docker-compose.dev.yml ps ollama

# Logs
docker logs -f elykia-dev-ollama

# Modèles installés
docker exec elykia-dev-ollama ollama list
# ou en natif Windows :
ollama list

# Test rapide
curl http://localhost:11434/api/tags
```

---

## Références

- [Ollama — téléchargement](https://ollama.com/download)
- [Ollama issue #3372 — certificat x509 en Docker](https://github.com/ollama/ollama/issues/3372)
- [Elykia IA — providers et prod](../backend/docs/AI_ASSISTANT.md)
