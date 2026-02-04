# Guide d'Installation Docker & Docker Swarm sur Ubuntu

Ce guide détaille les étapes pour installer Docker, Docker Compose et configurer un cluster Docker Swarm sur un serveur Ubuntu.

## 1. Prérequis

*   Un serveur Ubuntu (20.04 ou 22.04 recommandé).
*   Accès root ou utilisateur avec privilèges sudo.

## 2. Installation de Docker Engine

1.  **Mettre à jour l'index des paquets :**
    ```bash
    sudo apt-get update
    ```

2.  **Installer les paquets prérequis :**
    ```bash
    sudo apt-get install ca-certificates curl gnupg
    ```

3.  **Ajouter la clé GPG officielle de Docker :**
    ```bash
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    ```

4.  **Configurer le dépôt Docker :**
    ```bash
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```

5.  **Installer Docker Engine, containerd et Docker Compose :**
    ```bash
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ```

6.  **Vérifier l'installation :**
    ```bash
    sudo docker run hello-world
    ```

## 3. Configuration de l'utilisateur Docker (Éviter sudo)

Pour exécuter les commandes Docker sans `sudo` :

1.  **Créer le groupe docker (s'il n'existe pas déjà) :**
    ```bash
    sudo groupadd docker
    ```

2.  **Ajouter votre utilisateur au groupe docker :**
    ```bash
    sudo usermod -aG docker $USER
    ```

3.  **Appliquer les changements de groupe :**
    Déconnectez-vous et reconnectez-vous, ou lancez :
    ```bash
    newgrp docker
    ```

4.  **Tester :**
    ```bash
    docker run hello-world
    ```

## 4. Installation de Docker Compose (Standalone - Optionnel)

Si vous avez installé le plugin `docker-compose-plugin` à l'étape 2, vous pouvez utiliser la commande `docker compose`. Si vous préférez l'ancien binaire autonome `docker-compose` :

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

## 5. Initialisation de Docker Swarm

Docker Swarm est intégré à Docker Engine. Pour transformer votre nœud unique en manager Swarm :

1.  **Initialiser le Swarm :**
    ```bash
    docker swarm init
    ```
    *Note : Si vous avez plusieurs interfaces réseau, spécifiez l'IP à utiliser avec `--advertise-addr <IP_PRIVEE>`.*

2.  **Vérifier le statut du nœud :**
    ```bash
    docker node ls
    ```

Votre environnement est maintenant prêt pour déployer des stacks Docker !
