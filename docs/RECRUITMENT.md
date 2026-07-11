# Recrutement dynamique — ELYKIA

## Architecture modulith

Package racine : `com.optimize.elykia.recruitment` (hors `core/`).

| Bounded context | Rôle |
|-----------------|------|
| `shared` | Entités JPA, repositories, port MinIO |
| `site` | API publique site vitrine (`/api/public/recruitment`) |
| `admin` | API back-office (`/api/v1/recruitment`) |

## API publique (site)

- `GET /api/public/recruitment/offers` — offres publiées
- `GET /api/public/recruitment/offers/{id}` — détail offre publiée
- `POST /api/public/recruitment/applications` — candidature multipart (`cv` + champs formulaire)

## API admin (JWT + `ROLE_ADMIN` ou `ROLE_RECRUITMENT`)

- `GET/POST /api/v1/recruitment/offers` — liste / création (multipart : `offer` JSON + `image` optionnel)
- `PUT /api/v1/recruitment/offers/{id}` — édition
- `POST /api/v1/recruitment/offers/{id}/publish` | `/withdraw` — publication / retrait
- `DELETE /api/v1/recruitment/offers/{id}` — suppression logique
- `GET /api/v1/recruitment/applications` — candidatures (`?jobOfferId=` optionnel)
- `GET /api/v1/recruitment/applications/{id}/cv` — téléchargement CV

## MinIO

- Bucket : `elykia-recruitment` (`MINIO_RECRUITMENT_BUCKET`)
- Images offres : `offers/{id}/cover.{ext}` — URL publique via `MINIO_PUBLIC_URL`
- CV : `applications/{id}/cv.{ext}` — **privé**, accès via API admin uniquement

Configurer une policy MinIO lecture publique sur le préfixe `offers/` du bucket.

## Feature flag back-office

- Clé Firebase Remote Config : `recruitment` (désactivée par défaut dans `feature-flag.service.ts`)
- Permission : `ROLE_RECRUITMENT` (seed Flyway V77 + profil ADMIN)
- Après déploiement : activer `recruitment` dans Firebase Remote Config pour afficher le menu et les routes `/recruitment/*`.

## Site vitrine

- Variable conteneur : `ELYKIA_API_BASE` (ex. `https://elykia.amenouveve-yaveh.com/api`)
- Scripts : `website/src/js/config.js`, `website/src/js/recruitment.js`

## CORS

Origines site à inclure dans `SECURITY_CONFIG_ALLOW_ORIGIN` :

- `https://www.amenouveve-yaveh.com`
- `https://amenouveve-yaveh.com`
- `https://site.amenouveve-yaveh.com` (test)
