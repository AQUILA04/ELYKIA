# Ruban / bandeau environnement (hors prod)

## Objectif

Empêcher les utilisateurs de confondre les environnements pendant les tests : afficher clairement l’environnement (Test, Dev, …) hors production ; rien en prod.

## Frontend admin

- Ruban oblique fixe coin **top-left**, texte blanc sur fond rouge.
- Source : `APP_ENV` injecté dans `assets/js/env.js` au démarrage du conteneur (`__APP_ENV__`).
- Fallback hostname / `apiUrl` si `APP_ENV` absent (hôtes `*-test*`, localhost → DEV).
- Prod (`prod` / `production` / vide + hôte prod) : pas d’affichage.

## Mobile

- Bandeau rouge fixe en haut de l’app (connexion + après connexion).
- Sur l’écran de connexion : bandeau élargi + message d’avertissement.
- `envName` dans `environment*.ts`, injecté au build APK via `target` (test|prod).
- Fallback depuis `apiUrl` (`elykia-test`, localhost / IP privée).

## Déployabilité Contabo

- `APP_ENV=test` (compose test) / `APP_ENV=prod` (compose prod) dans les compose + exemples `.env`.
