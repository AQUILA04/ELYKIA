# Avancement

État au 2026-11-15. « Ça marche » signifie : le parcours est dans le produit et le changelog, pas qu’un essai runtime a été refait pour cette note.

## En place

- Cycle agence : référentiels, stock commercial et tontine, crédits, comptant avec remise magasin, caisse, rapport journalier, BI, commandes.
- Tontine : adhésion, collectes, session, livraison plafonnée, écarts de carnet, annulation des collectes d’un commercial (admin), ancien portefeuille.
- Mobile terrain local-first (commercial et chef de recouvrement), synchro, sauvegarde locale, contrôle de version APK au login.
- Espace client Android et web : achats, catalogue, panier, tontine, Mobile Money, OTP, pages confidentialité et suppression de compte.
- Elykia IA branchée (`/ai-chat`, API `api/v1/ai`), catalogue de schéma et index du guide. Fournisseur cloud optionnel.
- CI images, CD test/prod Contabo, E2E web après le test, APK mobile et espace client, gitleaks.
- Guide utilisateur par profil, servi dans l’admin (`frontend/src/user-guide/`) et indexé pour l’IA.

## Points d’attention (pas une liste de bugs ouverts)

- Docs générées en retard sur la stack : `docs/project-overview.md` et `docs/architecture-frontend.md` disent Angular 14 ; le `package.json` est en 18.2. `docs/index.md` omet l’espace client et le site.
- `backend/README.md` est encore un TODO.
- Préfixes REST `/api` et `/api/v1` coexistent.
- Parents Spring Boot de `backend-lib/` (3.1.3, 3.4.1, 3.3.0) ne sont pas alignés sur l’API (3.3.0).
- Client OTP maison dans `notificationhub/` : ne pas l’étendre (règle starter).
- Procédure FIFO `docs/diagnostic-fifo-entrees-sans-lot.md` (article « CUBE: ONGA quart », livraison refusée). Issue encore ouverte ou non : **à compléter**. Le texte demande d’ajouter 4 h aux timestamps UTC « pour l’heure Maurice », alors que l’activité décrite par le site est à Lomé (UTC+0) : **à clarifier**.
- Seuils JaCoCo du backend volontairement bas (lignes globales 0,46, branches 0,12) : filet anti-régression, pas un objectif de couverture.
- `package.json` à la racine ne déclare que `@ngrx/entity`. Ce n’est pas le point d’entrée d’une app. Rôle exact : **à compléter**.

## Suite

Backlog produit, priorités et dette choisie : **à compléter** (pas de fichier d’issues suivi dans le dépôt au moment de cette note ; les PR GitHub sont l’historique récent).
