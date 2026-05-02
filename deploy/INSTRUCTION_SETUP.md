# Instructions de Configuration Initiale du Serveur (Traefik + Multi-Environnements)
===================================================================================

Ce document détaille les étapes **manuelles** à exécuter une seule fois sur un nouveau serveur (VPS) pour mettre en place l'infrastructure ELYKIA.

L'architecture repose sur **Traefik** comme reverse proxy unique, gérant automatiquement les certificats SSL Let's Encrypt, et routant le trafic vers des stacks Docker isolées (`test` et `prod`).

## Prérequis
- Un serveur Ubuntu avec Docker (version >= 29.x) et Docker Compose installés.
- Un nom de domaine configuré pointant vers l'IP du serveur (ex: via Cloudflare).

---

## Étape 1 : Mettre à jour Docker (si nécessaire)
Traefik v3.x nécessite une version récente de l'API Docker. Vérifiez la version de Docker sur le serveur :
```bash
docker --version
```
Si la version est trop ancienne (ex: 1.24), mettez à jour Docker :
```bash
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Étape 2 : Récupérer les fichiers de déploiement
Connectez-vous en SSH sur le serveur et clonez/copiez le dossier `deploy` :
```bash
# Exemple si vous clonez le repo
git clone https://github.com/AQUILA04/ELYKIA.git /opt/elykia_src
cp -r /opt/elykia_src/deploy /opt/elykia/deploy
cd /opt/elykia/deploy
```

## Étape 3 : Exécuter le script de configuration initiale
Ce script crée la structure des dossiers, le réseau Docker partagé, les fichiers `.env` et démarre Traefik.
```bash
cd /opt/elykia/deploy
chmod +x setup-server.sh
sudo ./setup-server.sh
```
Lors de l'exécution, le script vous demandera de créer un identifiant et un mot de passe pour accéder au dashboard Traefik.

## Étape 4 : Configurer les permissions des logs
Pour que les conteneurs Spring Boot (qui tournent avec un utilisateur non-root) puissent écrire leurs logs, ajustez les permissions des dossiers créés :
```bash
sudo chmod o+w /opt/elykia/test/logs
sudo chmod o+w /opt/elykia/prod/logs
```

## Étape 5 : Éditer les secrets
Le script a généré des fichiers `.env` pour chaque environnement. Vous **devez** modifier les mots de passe par défaut.
```bash
nano /opt/elykia/test/.env
nano /opt/elykia/prod/.env
```
Remplacez les valeurs de `POSTGRES_PASSWORD` par des mots de passe forts.

## Étape 6 : Déployer les environnements
Vous pouvez maintenant déployer les stacks `test` et `prod` en utilisant le script `deploy.sh` :
```bash
cd /opt/elykia/deploy

# Déployer l'environnement de test
./deploy.sh test ghcr.io/aquila04/elykia-frontend:latest ghcr.io/aquila04/elykia-backend:latest

# Déployer l'environnement de production
./deploy.sh prod ghcr.io/aquila04/elykia-frontend:latest ghcr.io/aquila04/elykia-backend:latest
```

## Étape 7 : Configuration Cloudflare (DNS)
Dans Cloudflare, créez des enregistrements DNS de type **A** pointant vers l'IP de votre serveur :
- `elykia` -> IP du serveur (Proxy activé - nuage orange)
- `elykia-test` -> IP du serveur (Proxy activé - nuage orange)

Assurez-vous que le mode SSL/TLS dans Cloudflare est défini sur **"Full"** (et non "Flexible" ou "Full (strict)"). Traefik utilisera le challenge `HTTP-01` pour générer automatiquement les certificats Let's Encrypt.
