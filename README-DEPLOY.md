# Guide de Déploiement de l'Application ELYKIA

Ce document explique comment déployer l'application ELYKIA (Frontend + Backend + Base de données) en utilisant les images Docker hébergées sur GitHub Container Registry (GHCR).

## Prérequis

*   Docker et Docker Compose installés (voir `README-DOCKER-INSTALL.md`).
*   Le fichier `docker-compose.prod.yml` présent sur le serveur.
*   Un Personal Access Token (PAT) GitHub avec les droits `read:packages` pour tirer les images.

## 1. Authentification au Registre GitHub (GHCR)

Avant de pouvoir télécharger les images privées, vous devez vous connecter au registre de conteneurs de GitHub.

1.  Générez un PAT (Personal Access Token) sur GitHub (Settings > Developer settings > Personal access tokens) avec la permission `read:packages`.
2.  Connectez-vous sur le serveur :

```bash
export CR_PAT=VOTRE_TOKEN_GITHUB
echo $CR_PAT | docker login ghcr.io -u VOTRE_NOM_UTILISATEUR_GITHUB --password-stdin
```

## 2. Déploiement avec Docker Compose (Méthode Simple)

Pour un déploiement simple sur un serveur unique :

1.  **Télécharger les dernières images :**
    ```bash
    docker compose -f docker-compose.prod.yml pull
    ```

2.  **Lancer l'application en arrière-plan :**
    ```bash
    docker compose -f docker-compose.prod.yml up -d
    ```

3.  **Vérifier les logs :**
    ```bash
    docker compose -f docker-compose.prod.yml logs -f
    ```

4.  **Arrêter l'application :**
    ```bash
    docker compose -f docker-compose.prod.yml down
    ```

## 3. Déploiement avec Docker Swarm (Méthode Production)

Pour un déploiement plus robuste avec redémarrage automatique et gestion de cluster :

1.  **Initialiser Swarm (si ce n'est pas déjà fait) :**
    ```bash
    docker swarm init
    ```

2.  **Déployer la stack :**
    ```bash
    docker stack deploy -c docker-compose.prod.yml elykia
    ```
    *Note : Assurez-vous d'être authentifié sur le registre sur tous les nœuds du Swarm, ou utilisez `--with-registry-auth`.*
    ```bash
    docker stack deploy --with-registry-auth -c docker-compose.prod.yml elykia
    ```

3.  **Vérifier le statut des services :**
    ```bash
    docker service ls
    docker stack ps elykia
    ```

4.  **Mettre à jour l'application (après un nouveau build CI) :**
    ```bash
    # Tirer la nouvelle image
    docker compose -f docker-compose.prod.yml pull
    
    # Mettre à jour le service
    docker service update --image ghcr.io/aquila04/elykia-backend:main elykia_backend
    docker service update --image ghcr.io/aquila04/elykia-frontend:main elykia_frontend
    
    # OU redéployer toute la stack
    docker stack deploy --with-registry-auth -c docker-compose.prod.yml elykia
    ```

5.  **Supprimer la stack :**
    ```bash
    docker stack rm elykia
    ```

## Accès à l'application

*   **Frontend** : http://localhost (ou l'IP de votre serveur)
*   **Backend API** : http://localhost:8080 (ou l'IP de votre serveur)
