INSTRUCTION D'UTILISATION - bootstrap_server.sh
===============================================

Ce fichier décrit les étapes et commandes recommandées pour créer un utilisateur de déploiement sur
le serveur Ubuntu et exécuter le script `bootstrap_server.sh` fourni dans ce dépôt.

1) Création de l'utilisateur de déploiement (ex: `deploy`)
--------------------------------------------------------
Exécutez ces commandes en tant que root (ou avec `sudo`) sur le serveur Ubuntu.

Remarque : nous créons l'utilisateur sans mot de passe et autorisons uniquement l'accès par clé SSH.

```bash
# 1. Créer l'utilisateur (sans mot de passe interactif)
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

# 5. (Optionnel) Ajouter l'utilisateur au groupe docker pour pouvoir exécuter docker sans sudo
sudo usermod -aG docker deploy

# 6. Créer le dossier de déploiement et attribuer la propriété à l'utilisateur deploy
sudo mkdir -p /opt/elykia
sudo chown deploy:deploy /opt/elykia

# Après ces étapes, vous pouvez vous connecter en SSH avec l'utilisateur 'deploy'
# Exemple local :
# ssh deploy@your.server.ip
```

2) Préparer les secrets GitHub (pour GitHub Actions)
--------------------------------------------------
Ajoutez dans les Secrets du dépôt GitHub les éléments suivants (Settings → Secrets):

- `SSH_PRIVATE_KEY` : la clé privée correspondant à la clé publique ajoutée dans `authorized_keys`.
- `SSH_KNOWN_HOSTS` : résultat de `ssh-keyscan your.server.tld` (recommandé).

Exemple pour obtenir la valeur de `SSH_KNOWN_HOSTS` :

```bash
ssh-keyscan your.server.tld
```

3) Copier le code et le script bootstrap sur le serveur
-----------------------------------------------------
Si vous avez cloné le repo directement sur le serveur en tant qu'utilisateur `deploy`, vous pouvez
ignorer cette étape. Sinon, depuis votre poste local, copiez le dossier `deploy/` vers `/opt/elykia` :

```bash
# depuis votre poste local
scp -r deploy deploy_user@your.server.tld:/tmp/deploy
# puis sur le serveur
sudo mv /tmp/deploy /opt/elykia/deploy
sudo chown -R deploy:deploy /opt/elykia/deploy
```

4) Exécuter le script bootstrap
-------------------------------
Le script installe Docker, nginx, certbot, crée un service systemd et planifie les backups.
Exécutez-le en tant que root (sudo) :

```bash
sudo bash /opt/elykia/deploy/bootstrap_server.sh --deploy-path /opt/elykia --repo https://github.com/AQUILA04/ELYKIA.git --branch main --user deploy
```

Options utiles :
- `--deploy-path` : chemin où placer le dossier (défaut `/opt/elykia`)
- `--repo` : URL du dépôt si vous voulez que le script clone le dépôt
- `--branch` : branche à cloner (défaut `main`)
- `--user` : nom de l'utilisateur de déploiement (par défaut `ubuntu` dans le script, ici utilisez `deploy`)

5) Après exécution du bootstrap
-------------------------------
- Editez `/opt/elykia/deploy/.env` pour y renseigner les variables sensibles (mot de passe Postgres, `SPRING_DATASOURCE_*`, `GHCR_TOKEN` etc.).
- Si vous utilisez des images privées GHCR, ajoutez `GHCR_USERNAME` et `GHCR_TOKEN` dans les secrets GitHub et dans `.env` si nécessaire.
- Obtenez un certificat TLS si vous avez un domaine pointant sur le serveur :

```bash
sudo certbot --nginx -d your.domain.tld --email you@example.com --agree-tos --no-eff-email
```

6) Lancer un premier déploiement manuel (test)
---------------------------------------------
Se connecter en SSH avec l'utilisateur `deploy` puis lancer :

```bash
cd /opt/elykia/deploy
./deploy.sh test ghcr.io/OWNER/ELYKIA-frontend:<sha> ghcr.io/OWNER/ELYKIA-backend:<sha>
```

7) Remarques de sécurité
------------------------
- Préferez l'accès SSH par clés (pas de mots de passe). Ne mettez jamais la clé privée dans le dépôt.
- Restreignez l'accès SSH au besoin (pare-feu, fail2ban).
- Testez d'abord sur l'environnement `test` avant de promouvoir en `prod`.

Si tu veux, je peux générer un example d'action GitHub (workflow) qui se connecte en SSH et exécute `deploy.sh` en utilisant les secrets ci-dessus.

