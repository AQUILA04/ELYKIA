INSTRUCTION D'UTILISATION - Création de l'utilisateur de déploiement
====================================================================

Ce document décrit les étapes recommandées pour créer un utilisateur dédié au déploiement (`deploy`) sur le serveur Ubuntu et préparer la connexion avec GitHub Actions.

## 1) Création de l'utilisateur de déploiement
Exécutez ces commandes en tant que root (ou avec `sudo`) sur le serveur Ubuntu. L'utilisateur est créé sans mot de passe interactif, l'accès se fera uniquement par clé SSH.

```bash
# 1. Créer l'utilisateur
sudo adduser --disabled-password --gecos "" deploy

# 2. Donner les droits sudo (si nécessaire pour administration)
sudo usermod -aG sudo deploy

# 3. Créer le répertoire .ssh et restreindre les permissions
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chown deploy:deploy /home/deploy/.ssh

# 4. Ajouter votre clé publique SSH (remplacez 'ssh-rsa AAAA...' par la clé publique réelle)
echo 'ssh-rsa AAAA... your-key-comment' | sudo tee /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys

# 5. Ajouter l'utilisateur au groupe docker pour exécuter docker sans sudo
sudo usermod -aG docker deploy

# 6. Créer le dossier de déploiement de base et attribuer la propriété
sudo mkdir -p /opt/elykia
sudo chown deploy:deploy /opt/elykia
```

## 2) Préparer les secrets GitHub (pour GitHub Actions)
Dans votre dépôt GitHub, allez dans **Settings → Secrets and variables → Actions**.

**Créer les Repository Secrets (globaux) :**
- `SSH_PRIVATE_KEY` : la clé privée correspondant à la clé publique ajoutée ci-dessus.
- `SSH_KNOWN_HOSTS` : le résultat de la commande `ssh-keyscan your.server.ip` (recommandé pour éviter les avertissements SSH).
- `GHCR_USERNAME` : votre nom d'utilisateur GitHub.
- `GHCR_TOKEN` : un Personal Access Token (PAT) avec le scope `read:packages`.

**Créer les Environment Secrets (Settings → Environments) :**
Créez deux environnements (`test` et `prod`) et ajoutez ces secrets dans chacun d'eux :
- `SERVER_USER` : `deploy` (ou `root` selon votre choix).
- `SERVER_HOST` : l'adresse IP de votre serveur.
- `DEPLOY_PATH` : `/opt/elykia` (c'est le dossier parent où se trouve le dossier `deploy`).

## 3) Configuration Initiale du Serveur
Une fois l'utilisateur créé et le code récupéré sur le serveur, veuillez suivre les étapes décrites dans le fichier **`INSTRUCTION_SETUP.md`** pour initialiser l'infrastructure Traefik et préparer les environnements `test` et `prod`.

## 4) Remarques de sécurité
- Préférez toujours l'accès SSH par clés. Ne mettez jamais la clé privée dans le dépôt.
- Restreignez l'accès SSH si possible (configuration du pare-feu `ufw`, utilisation de `fail2ban`).
- L'architecture actuelle utilise des dossiers `.env` isolés pour chaque environnement (`/opt/elykia/test/.env` et `/opt/elykia/prod/.env`) pour garantir que les secrets de production ne soient pas exposés à l'environnement de test.
