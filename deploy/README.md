README déploiement — ELYKIA
=================================

Ce dossier contient des scripts et des fichiers docker-compose pour déployer les images Docker (frontend et backend) et une base Postgres sur un serveur Ubuntu.

Structure
---------
- `docker-compose.test.yml` - Compose pour l'environnement de test (expose Postgres et ports utiles)
- `docker-compose.prod.yml` - Compose pour l'environnement de production (Postgres non exposé)
- `deploy.sh` - script pour déployer une paire d'images (frontend/backend) et enregistrer la release
- `rollback.sh` - script pour revenir à une release précédente
- `import-db.sh` - script pour importer un dump SQL (ou .gz) dans le container Postgres
- `releases/` - répertoire créé par `deploy.sh` contenant l'historique des releases

Prérequis sur le serveur (Ubuntu)
-------------------------------
- Docker (version récente) et Docker Compose (v2 cli intégrée) installés
- Compte utilisateur avec droits pour exécuter docker (ou via sudo)
- Accès SSH depuis GitHub Actions (ou votre CI) vers le serveur

Processus de déploiement (manuel)
---------------------------------
1) Copier/placer les scripts sur le serveur dans un répertoire (ex: `/opt/elykia/deploy`).
2) Rendre exécutables les scripts:

```bash
chmod +x deploy/*.sh
```

3) Déployer une version:

```bash
# depuis le serveur
./deploy/deploy.sh test ghcr.io/OWNER/ELYKIA-frontend:TAG ghcr.io/OWNER/ELYKIA-backend:TAG
```

4) Rollback (exemples):

```bash
# revenir au dernier déploiement précédent
./deploy/rollback.sh prod --last

# revenir à un release spécifique
./deploy/rollback.sh prod deploy/releases/prod_20260427T120000Z.txt
```

Importer un dump de la base de données (une fois)
-----------------------------------------------
1) Copier le dump depuis votre machine locale vers le serveur (SCP) :

```bash
scp /local/path/dump.sql.gz user@server:/tmp/dump.sql.gz
```

2) Se connecter au serveur et lancer l'import :

```bash
ssh user@server
./deploy/import-db.sh prod /tmp/dump.sql.gz
```

Notes:
- Le script `import-db.sh` démarre le service `db` si nécessaire.
- Les variables de connexion PostgreSQL peuvent être définies dans le fichier `.env` situé dans le même dossier (généré automatiquement par `deploy.sh`).
 - En production, le fichier `docker-compose.prod.yml` n'expose pas le port 80 du frontend sur l'hôte: un reverse-proxy (nginx) sur le serveur doit être configuré pour gérer TLS et le routage.

Configurer nginx et TLS (Let's Encrypt)
--------------------------------------
Un script d'exemple `setup_nginx.sh` est fourni dans ce dossier. Il installe `nginx` et `certbot`, déploie une configuration template (`nginx/elykia.conf`) et tente d'obtenir un certificat Let's Encrypt pour le domaine fourni.

Exemple (sur le serveur):

```bash
cd /opt/elykia/deploy
sudo ./setup_nginx.sh your.domain.tld you@example.com
```

Éditez le fichier template `deploy/nginx/elykia.conf` pour ajuster les chemins ou les routes avant d'exécuter le script si nécessaire.

Backups automatiques de la base
------------------------------
Un script `db_backup.sh` est fourni pour effectuer des sauvegardes de la base Postgres (format custom via `pg_dump -Fc`) et stocker les fichiers sur le serveur dans `/var/backups/elykia/<YYYY-MM-DD>/`.

Le comportement par défaut :
- Sauvegarde au moment de l'exécution du script dans `/var/backups/elykia/<date>/`.
- Supprime les dossiers plus anciens que la semaine précédente (garde la semaine en cours et la précédente).

Planification (cron) recommandée sur le serveur Ubuntu (hors container)
------------------------------------------------------------------------
Éditez la crontab pour l'utilisateur qui exécute Docker et ajoutez la ligne suivante pour exécuter la sauvegarde à 08:00 et 19:00 du lundi au samedi :

```cron
0 8,19 * * 1-6 cd /opt/elykia/deploy && /opt/elykia/deploy/db_backup.sh prod >> /var/log/elykia_db_backup.log 2>&1
```

Remarques :
- Le script s'attend à trouver le dossier `deploy` déployé sur le serveur (ex : `/opt/elykia/deploy`) et au moins Docker et docker-compose installés.
- Les backups sont stockées sur le serveur hôte (pas dans le conteneur) pour faciliter la rétention et la rotation.

Backup avant import de dump
---------------------------
Le script `import-db.sh` appellera automatiquement `db_backup.sh` avant d'appliquer la restauration, afin d'assurer un point de retour en cas de problème.


CI / GitHub Actions — secrets nécessaires
----------------------------------------
Pour que GitHub Actions puisse se connecter et déclencher le déploiement sur vos serveurs, créez les secrets suivants (dans les Settings > Secrets du repo). Les noms peuvent être différents, mais adaptez le workflow CI en conséquence.

Secrets globaux/obligatoires:
- `SSH_PRIVATE_KEY` : clé privée SSH (format PEM) utilisée par Actions pour se connecter au serveur
- `SSH_KNOWN_HOSTS` : (recommandé) contenu de `ssh-keyscan your.server.com` pour éviter les prompts

Secrets par environnement (test/prod). Exemple de nommage : `TEST_SERVER_USER`, `TEST_SERVER_HOST`, `TEST_DEPLOY_PATH` :
- `TEST_SERVER_USER` / `PROD_SERVER_USER` : utilisateur SSH (ex: ubuntu)
- `TEST_SERVER_HOST` / `PROD_SERVER_HOST` : IP ou domaine du serveur
- `TEST_DEPLOY_PATH` / `PROD_DEPLOY_PATH` : chemin où est situé le dossier `deploy` (ex: `/opt/elykia`)

Secrets pour accès à GHCR (si images privées)
- `GHCR_USERNAME` : nom d'utilisateur (ex: ghcr.io uses your username or a github actions bot)
- `GHCR_TOKEN` : token (PAT) avec scope `read:packages` pour pouvoir docker login sur le serveur et pull les images privées

Exemple d'utilisation dans un job GitHub Actions (résumé)
------------------------------------------------------
# 1) Utiliser `actions/checkout@v4` et builder/pusher vos images sur GHCR
# 2) Déployer : se connecter en SSH et appeler `deploy.sh` en fournissant les tags d'image

Veillez à :
- sécuriser l'accès SSH (pare-feu, fail2ban, clés, pas de mot de passe)
- effectuer des backups avant toute importation de base de données

Questions que j'ai pour toi
--------------------------
1) Souhaites-tu que j'ajoute un example de job GitHub Actions (dans `.github/workflows/ci.yml`) qui SSH et exécute `deploy.sh` pour `test` et `prod` (avec conditions: push sur `main` -> test, push sur `prod/**` -> prod) ?
2) As-tu un reverse-proxy (nginx) et des certificats TLS gérés sur le serveur, ou veux-tu que je fournisse un exemple pour configurer `nginx` et `certbot` ?
3) Ton backend est-il une application Spring Boot (utilise-t-elle `SPRING_DATASOURCE_*`) ? Si non, indique les variables d'environnement que ton backend attend pour la connexion à la base.
4) Veux-tu que l'import de la base de données utilise `pg_restore` (pour des dumps custom-format) ou `psql` (SQL plain/gzip) ?

Quand tu réponds à ces questions je peux :
- ajouter un job de déploiement dans `.github/workflows/ci.yml` adapté à ton workflow
- personnaliser les variables env nécessaires au backend
- ajouter une configuration nginx + TLS si voulu

