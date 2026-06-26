# Elykia IA — Assistant conversationnel

## Vue d'ensemble

Module backend `com.optimize.elykia.core.ai` exposant :

- **Text-to-SQL sécurisé** (questions données ad-hoc) avec few-shot par domaine
- **RAG user-guide** hybride (embeddings Ollama + fallback mots-clés)
- **Sessions de conversation** persistées (`ai_conversation` / `ai_message`)
- **Journal des requêtes** (`ai_query_log`) pour statistiques admin

Interface admin : route **`/ai-chat`** (discussion + onglet statistiques pour `ROLE_AI_REPORT`).

## Rôles dédiés

| Rôle | Accès |
|------|--------|
| `ROLE_AI_CHAT` | Conversation Elykia IA (menu, header, API chat/sessions) |
| `ROLE_AI_REPORT` | Statistiques IA (onglet admin, API `/api/v1/ai/admin/stats`) |

Par défaut assignés aux profils **GESTIONNAIRE** et **ADMIN** (auto-init au démarrage).

## Activation

### Backend

```yaml
elykia:
  ai:
    enabled: true
    provider: stub   # stub | ollama | anthropic | openai | gemini | deepseek
    model: claude-sonnet-4-20250514   # informatif (/health) — le modèle effectif est dans spring.ai.*
    rate-limit-per-user-per-minute: 15
    rate-limit-per-user-per-day: 20
    rate-limit-per-user-per-week: 120
```

### Frontend

- Dev : `environment.aiChatEnabled: true`
- Prod : feature flag Firebase Remote Config `elykiaAi` (ou `aiChatEnabled` via `__env`)

---

## Providers LLM

L'orchestrateur (`SqlGenerationService`, `IntentClassifier`, `UserGuideAnswerFormatter`) passe toujours par l'abstraction Spring AI `ChatClient`. Seul le **bean `ChatModel` actif** change selon `elykia.ai.provider`.

| Provider | Usage | Authentification |
|----------|-------|------------------|
| `stub` | Dev local, CI, tests | Aucune |
| `ollama` | Dev local avec LLM réel | Instance locale |
| `anthropic` | Prod cloud (Claude) | `ANTHROPIC_API_KEY` |
| `openai` | Prod cloud (GPT) | `OPENAI_API_KEY` |
| `gemini` | Prod cloud (Google Gemini via Vertex AI) | Compte GCP + ADC |
| `deepseek` | Prod cloud (DeepSeek) | `DEEPSEEK_API_KEY` |

> **Important :** `elykia.ai.model` sert surtout à l'affichage `/api/v1/ai/health`. Le modèle réellement appelé est défini dans `spring.ai.*.chat.options`.
>
> **Auto-config Spring AI :** seul le provider indiqué par `elykia.ai.provider` est activé (`AiProviderEnvironmentPostProcessor`). Avec `provider: stub`, aucune clé API cloud n'est requise au démarrage — chat, audio, image, embeddings et moderation des starters cloud restent désactivés (`spring.ai.model.*: none`).

### Provider stub (défaut)

Aucune dépendance externe. Réponses déterministes pour dev et CI. RAG en mode mots-clés.

### Provider Ollama (dev local)

```bash
docker compose -f deploy/docker-compose.dev.yml up -d ollama
docker exec -it elykia-dev-ollama ollama pull qwen2.5-coder:7b
docker exec -it elykia-dev-ollama ollama pull nomic-embed-text
```

```yaml
elykia:
  ai:
    provider: ollama
    model: qwen2.5-coder:7b
    help:
      embedding-search-enabled: true
      embedding-model: nomic-embed-text
spring:
  ai:
    model:
      embedding: ollama   # requis pour le RAG vectoriel (évite conflit OpenAI/Ollama)
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

Modèles recommandés : `qwen2.5-coder:7b` (SQL), `nomic-embed-text` (RAG vectoriel).

> **Installation Docker, configuration backend et dépannage TLS (réseau entreprise)** : voir [`deploy/OLLAMA_DEV.md`](../../deploy/OLLAMA_DEV.md).

### Provider Anthropic / Claude (prod cloud)

**Prérequis :** dépendance `spring-ai-starter-model-anthropic` (déjà dans le `pom.xml`).

#### 1. Clé API (ne jamais commiter)

```bash
# Linux / macOS / conteneur
export ANTHROPIC_API_KEY=sk-ant-...

# Windows PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Ou via secrets du déploiement (Docker, Kubernetes, variables d'environnement hébergeur).

#### 2. Configuration application (prod)

```yaml
elykia:
  ai:
    enabled: true
    provider: anthropic
    model: claude-sonnet-4-20250514

spring:
  ai:
    ollama:
      enabled: false          # désactiver Ollama en prod cloud
    anthropic:
      api-key: ${ANTHROPIC_API_KEY}
      chat:
        options:
          model: claude-sonnet-4-20250514
          temperature: 0.1      # bas pour SQL déterministe
          max-tokens: 4096
```

#### 3. Modèles Claude recommandés

| Modèle | Cas d'usage Elykia |
|--------|-------------------|
| `claude-sonnet-4-20250514` | **Recommandé** — bon rapport qualité/coût pour Text-to-SQL |
| `claude-3-5-haiku-latest` | Réponses HOW_TO plus légères, coût réduit |
| `claude-opus-4-*` | Questions SQL très complexes (coût plus élevé) |

Liste à jour : [console.anthropic.com](https://console.anthropic.com/).

#### 4. RAG (HOW_TO) avec Claude

Anthropic ne fournit **pas** d'API d'embeddings. En prod avec `provider: anthropic` :

- **Par défaut** : recherche RAG par mots-clés (déjà fonctionnelle, `help.embedding-search-enabled: false`)
- **Option avancée** (phase ultérieure) : embeddings via OpenAI, Voyage AI ou service dédié, tout en gardant Claude pour le chat

#### 5. Vérification

```http
GET /api/v1/ai/health
Authorization: Bearer <token>
```

Réponse attendue : `"provider": "anthropic"`, `"model": "claude-sonnet-4-20250514"`.

---

### Provider OpenAI / GPT (prod cloud)

**Prérequis :** `spring-ai-starter-model-openai` (déjà dans le `pom.xml`).

#### 1. Clé API

```bash
export OPENAI_API_KEY=sk-...
# Windows PowerShell
$env:OPENAI_API_KEY = "sk-..."
```

#### 2. Configuration

```yaml
elykia:
  ai:
    enabled: true
    provider: openai
    model: gpt-4o

spring:
  ai:
    ollama:
      enabled: false
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o
          temperature: 0.1
          max-tokens: 4096
```

#### 3. Modèles recommandés

| Modèle | Cas d'usage Elykia |
|--------|-------------------|
| `gpt-4o` | **Recommandé** — Text-to-SQL et HOW_TO |
| `gpt-4o-mini` | Coût réduit, questions simples |
| `o3-mini` | Raisonnement avancé (si disponible sur votre compte) |

#### 4. RAG (HOW_TO)

OpenAI propose des embeddings (`text-embedding-3-small`) — intégration embeddings+RAG cloud possible en phase ultérieure. Par défaut : recherche par mots-clés.

#### 5. Vérification

`GET /api/v1/ai/health` → `"provider": "openai"`.

---

### Provider Gemini (prod cloud — Vertex AI)

**Prérequis :** `spring-ai-starter-model-vertex-ai-gemini` (déjà dans le `pom.xml`).

> Avec Spring AI **1.0**, le provider `gemini` utilise **Vertex AI** (Google Cloud), pas une simple clé AI Studio. Authentification via Application Default Credentials (ADC).

#### 1. Prérequis GCP

```bash
# Installer gcloud CLI, puis :
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=votre-projet-id
export GOOGLE_CLOUD_LOCATION=us-central1
```

#### 2. Configuration

```yaml
elykia:
  ai:
    enabled: true
    provider: gemini
    model: gemini-2.0-flash

spring:
  ai:
    ollama:
      enabled: false
    vertex:
      ai:
        gemini:
          project-id: ${GOOGLE_CLOUD_PROJECT}
          location: ${GOOGLE_CLOUD_LOCATION:us-central1}
          chat:
            options:
              model: gemini-2.0-flash
              temperature: 0.1
              max-output-tokens: 4096
```

#### 3. Modèles recommandés

| Modèle | Cas d'usage Elykia |
|--------|-------------------|
| `gemini-2.0-flash` | **Recommandé** — rapide, bon pour SQL |
| `gemini-2.5-flash-preview-*` | Qualité supérieure (vérifier région GCP) |
| `gemini-2.5-pro-preview-*` | Questions complexes (coût plus élevé) |

Vérifier les [régions supportées](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations) par modèle.

#### 4. RAG (HOW_TO)

Comme Anthropic : pas d'embeddings Vertex dans le pipeline actuel → mots-clés par défaut.

#### 5. Vérification

`GET /api/v1/ai/health` → `"provider": "gemini"`.

#### Alternative : Google AI Studio (clé API seule)

Si vous préférez une clé `GEMINI_API_KEY` sans GCP, Spring AI propose le starter `spring-ai-starter-model-google-genai` (versions **1.1+**). Non inclus dans la version actuelle (BOM 1.0.0) — upgrade Spring AI ou provider Vertex ci-dessus.

---

### Provider DeepSeek (prod cloud)

**Prérequis :** `spring-ai-starter-model-deepseek` (déjà dans le `pom.xml`).

DeepSeek expose un starter natif Spring AI 1.0 (pas besoin du contournement OpenAI-compatible).

#### 1. Clé API

Créer une clé sur [platform.deepseek.com](https://platform.deepseek.com/api_keys) :

```bash
export DEEPSEEK_API_KEY=sk-...
# Windows PowerShell
$env:DEEPSEEK_API_KEY = "sk-..."
```

#### 2. Configuration

```yaml
elykia:
  ai:
    enabled: true
    provider: deepseek
    model: deepseek-chat

spring:
  ai:
    ollama:
      enabled: false
    deepseek:
      api-key: ${DEEPSEEK_API_KEY}
      chat:
        options:
          model: deepseek-chat
          temperature: 0.1
          max-tokens: 4096
```

#### 3. Modèles recommandés

| Modèle | Cas d'usage Elykia |
|--------|-------------------|
| `deepseek-chat` | **Recommandé** — Text-to-SQL et HOW_TO, bon rapport qualité/coût |
| `deepseek-reasoner` | Raisonnement avancé (CoT) — plus lent, utile pour SQL complexe |

#### 4. RAG (HOW_TO)

Pas d'API embeddings DeepSeek → recherche par mots-clés par défaut (`help.embedding-search-enabled: false`).

#### 5. Vérification

`GET /api/v1/ai/health` → `"provider": "deepseek"`.

#### Alternative : API compatible OpenAI

Si besoin, DeepSeek est aussi accessible via le provider `openai` :

```yaml
elykia:
  ai:
    provider: openai
spring:
  ai:
    openai:
      api-key: ${DEEPSEEK_API_KEY}
      base-url: https://api.deepseek.com
      chat:
        options:
          model: deepseek-chat
```

Préférer le provider natif `deepseek` lorsque possible.

---

## API (testable via Swagger)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/v1/ai/conversations` | Nouvelle session |
| GET | `/api/v1/ai/conversations` | Liste sessions utilisateur |
| GET | `/api/v1/ai/conversations/{id}` | Messages d'une session |
| DELETE | `/api/v1/ai/conversations/{id}` | Supprimer session |
| POST | `/api/v1/ai/chat` | Envoyer message (`conversationId` requis) |
| GET | `/api/v1/ai/health` | Statut module + provider/modèle |
| GET | `/api/v1/ai/schema/domains` | Domaines DATA (chips UI) |
| GET | `/api/v1/ai/admin/stats?days=30` | Stats admin (requêtes fréquentes, SQL rejetés) |

## Sécurité

- SELECT uniquement (validateur JSqlParser)
- Tables whitelistées (`resources/ai/schema-catalog.json`)
- Filtre row-level `collector` / `commercial_username` pour profil PROMOTER
- LIMIT 500 et timeout 10s
- Rate limit anti-abus : **15 requêtes/minute**
- Quotas : **20 requêtes/jour** et **120/semaine** par utilisateur (`AiRateLimiter`)
- Audit structuré SLF4J (`AiAuditService`) + persistance `ai_query_log`
- Clés API cloud : **variables d'environnement uniquement**, jamais dans le dépôt Git

## Few-shot SQL

Fichier `resources/ai/sql-examples.json` — exemples par domaine (`credit`, `recouvrement`, `tontine`, `stock`, `rapports`) injectés dans le prompt de génération et de correction SQL.

## Métriques Micrometer

- `ai.intent.distribution` (tag `intent`)
- `ai.sql.latency` (tag `success`)
- `ai.help.sources_hit`
- `ai.query.status` (tag `status`)

## Recouvrement

Table de référence : **`credit_timeline`** (chaque ligne = une mise/paiement).

## UI admin

- **Header** : bouton « Ask AI » → `/ai-chat`
- **Sidebar** (section Aide) : entrée « Elykia IA »
- **Onglet Discussion** : sessions, fil, preview DATA, sources HOW_TO
- **Onglet Statistiques** (`ROLE_AI_REPORT`) : intents, requêtes fréquentes, SQL rejetés, latence DATA moyenne
- **Accès chat** (`ROLE_AI_CHAT`) : bouton header, sidebar, route `/ai-chat`

## Checklist mise en prod (cloud)

Commun à tous les providers :

- [ ] `elykia.ai.enabled=true` et `elykia.ai.provider` = `anthropic` | `openai` | `gemini` | `deepseek`
- [ ] `spring.ai.ollama.enabled=false`
- [ ] `elykia.ai.model` aligné sur le modèle Spring AI (health UI)
- [ ] Rôles `ROLE_AI_CHAT` / `ROLE_AI_REPORT` attribués
- [ ] Feature flag frontend `elykiaAi` ou `aiChatEnabled` activé
- [ ] Test fumée : question DATA + question HOW_TO via `/ai-chat`

Spécifique par provider :

| Provider | Secret / auth requis |
|----------|---------------------|
| `anthropic` | `ANTHROPIC_API_KEY` |
| `openai` | `OPENAI_API_KEY` |
| `gemini` | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, ADC (`gcloud auth application-default login`) |
| `deepseek` | `DEEPSEEK_API_KEY` |
