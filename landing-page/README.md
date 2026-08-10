# Elykia product landing page

Static marketing site for **https://elykia.optimizesolux.com**.

## Local preview

Open `index.html` via any static server, e.g.:

```bash
npx --yes serve .
```

## Deploy (Contabo + shared Traefik)

### GitHub Actions (recommandé)

Workflow : [`.github/workflows/deploy-landing-page.yml`](../.github/workflows/deploy-landing-page.yml)

- Déclenché uniquement sur `push` vers `main` si des fichiers changent sous `landing-page/**` (ou le workflow lui-même)
- Aussi disponible en **Run workflow** (`workflow_dispatch`)

Secrets à configurer dans le dépôt ELYKIA → **Settings → Secrets and variables → Actions** :

| Secret | Obligatoire | Exemple | Description |
|--------|-------------|---------|-------------|
| `VPS_HOST` | oui | `169.58.127.90` | IP / hostname du VPS Contabo |
| `VPS_USER` | oui | `root` | Utilisateur SSH |
| `SSH_PRIVATE_KEY` | oui | `-----BEGIN OPENSSH PRIVATE KEY-----…` | Clé privée autorisée sur le VPS |
| `VPS_LANDING_PATH` | non | `/opt/optimizesolux/elykia-landing` | Dossier distant (défaut ci-contre) |
| `LANDING_HOST` | non | `elykia.optimizesolux.com` | Host Traefik / URL publique |
| `LANDING_COMPOSE_PROJECT` | non | `elykia-landing` | Nom du projet Docker Compose |

### Manuel

```bash
# Sur le VPS
mkdir -p /opt/optimizesolux/elykia-landing
# rsync / copy this folder there, then:
cd /opt/optimizesolux/elykia-landing
docker network inspect traefik-public >/dev/null 2>&1 || docker network create traefik-public
echo 'LANDING_HOST=elykia.optimizesolux.com' > .env
docker compose --project-name elykia-landing up -d --build
```

DNS (Cloudflare, **Proxied** / orange + SSL Full — shared-traefik DNS-01) :

| Type | Name | Content |
|------|------|---------|
| A | `elykia` | Contabo VPS IP |

## Demo requests

Form → `support.elykia@optimizesolux.com` (FormSubmit + mailto fallback).  
Cloudflare Email Routing forwards that address to `francis.ahonsou@gmail.com`.
