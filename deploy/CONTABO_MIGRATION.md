# Migration DigitalOcean → Contabo (ELYKIA + OCI)

Objectif : basculer ELYKIA vers le VPS Contabo où **shared-traefik** et **optimize-common-infra** tournent déjà, sans reconfigurer manuellement Traefik / MinIO / Grafana / pgAdmin sur Contabo. Après le script : **changer le DNS** uniquement.

## Prérequis Contabo

1. `shared-traefik` up (`traefik-public`) avec **DNS-01 Cloudflare** (`CF_DNS_API_TOKEN` dans `/opt/optimizesolux/traefik/.env`)
2. Token Cloudflare autorisé sur les zones concernées (`optimizesolux.com` **et** `amenouveve-yaveh.com` si les hosts ELYKIA restent sur ce domaine)
3. `optimize-common-infra` up (`optimizesolux-common`, MinIO, Grafana, pgAdmin, Prometheus)
4. Prometheus OCI à jour (job `elykia-backend`) — `install.sh --force-update prometheus`

## Prérequis DigitalOcean

- Stacks ELYKIA vivantes sous `/opt/elykia`
- Accès root/sudo pour installer `sshpass` si besoin
- Mot de passe SSH Contabo (ou adapter le script vers une clé)

## Exécution (sur DigitalOcean)

```bash
cd /opt/elykia/deploy
# Si le script n'est pas encore sur le serveur : git pull / update-deploy.sh
chmod +x migrate-do-to-contabo.sh

sudo ./migrate-do-to-contabo.sh \
  --user root \
  --ip 169.58.127.90 \
  --password 'MOT_DE_PASSE_CONTABO' \
  --envs prod
  # ou: --envs prod,test
```

Options utiles :

| Option | Effet |
|--------|--------|
| `--dry-run` | Vérifie SSH + réseaux Contabo uniquement |
| `--skip-minio` | Ne copie pas les objets S3 |
| `--skip-images` | Ne transfère pas les images Docker (pull GHCR côté Contabo) |

## Ce que le script fait

| Étape | Action |
|-------|--------|
| 1 | SSH Contabo, vérifie `traefik-public` + `optimizesolux-common` |
| 2 | Lit `MINIO_ROOT_*` depuis `/opt/optimizesolux/common-infra/.env` |
| 3 | Sync `deploy/` → `/opt/elykia/deploy` |
| 4 | Génère `.env` Contabo (MinIO → OCI, OTel → collector) |
| 5 | `pg_dump` DO → restore Postgres Contabo (compose slim) |
| 6 | `mc mirror` buckets MinIO DO → MinIO OCI |
| 7 | `docker save` / `load` images FE/BE |
| 8 | `docker compose -f docker-compose.contabo-*.yml up -d` |

**Non migrés** (volontairement) : Traefik produit, MinIO produit, monitoring produit, pgAdmin produit.

## Compose Contabo

- `docker-compose.contabo-prod.yml` — FE + BE + DB (`elykia-db` sur `optimizesolux-common`)
- `docker-compose.contabo-test.yml` — idem test (buckets `*-test` sur MinIO partagé)

## Après migration

1. **DNS Cloudflare** (zone app) : A → IP Contabo, **Proxy ON**, SSL **Full**
2. **pgAdmin** `https://pgadmin.optimizesolux.com` :
   - Host `elykia-db`, port `5432`, credentials `/opt/elykia/prod/.env`
3. **Grafana** `https://grafana.optimizesolux.com` :
   - Conteneurs / logs déjà visibles (cAdvisor, Promtail)
   - Métriques actuator via job Prometheus `elykia-backend`
   - Importer au besoin les dashboards `deploy/monitoring/grafana/dashboards/`
4. Secrets GitHub Actions : `SERVER_HOST` → IP Contabo
5. Smoke, puis arrêt des stacks DO

## Rollback

Garder DO allumé pendant la validation. En cas de problème : rebasculer les A records Cloudflare vers l’IP DigitalOcean.
