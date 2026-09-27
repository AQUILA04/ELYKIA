# Plan — Photo BO + GPS inscription + validation visage

## Confirmation photo BO

- Avec MinIO UP, `uploadClientPhotos` renseigne `profilPhotoUrl` → affichage dans le détail Inscriptions clients.
- MinIO DOWN → URL null (outbox) → zone Profil vide (comportement observé).
- Ajout : clic photo → lightbox aperçu agrandi (profil + pièce).

## GPS à l'inscription

- Capture auto via `@capacitor/geolocation` (permission Android si besoin).
- Envoi `latitude` / `longitude` / `mll` dans `CustomerRegisterRequest`.
- Backend persiste sur `Client`.

## Photo profil = visage

- Native : Camera + `@capacitor-mlkit/face-detection` (comme mobile).
- Web / E2E : file input sans ML Kit (même skip que mobile web).
