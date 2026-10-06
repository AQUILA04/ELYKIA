---
name: customer-space account deletion Play Console
overview: Exposer une page publique de demande de suppression de compte (URL Play Console) et un lien in-app, avec traitement manuel par e-mail.
todos:
  - id: public-page
    content: Page publique Type C /suppression-compte + mailto
    status: completed
  - id: in-app-links
    content: Liens auth, profil, confidentialité
    status: completed
  - id: play-console-doc
    content: Doc Play Console + guide utilisateur
    status: completed
isProject: false
---

# Suppression de compte — Espace Client (Play Console)

Google Play exige, pour une app qui crée des comptes :

1. Une **URL web** publique (sans installer l’app) décrivant la demande de suppression.
2. Un **chemin dans l’application** facilement accessible.

## Choix produit

- Pas de suppression automatique (crédits, contrats, tontine) : **demande par e-mail** à `support@optimizesolux.com`.
- Page publique : `https://clients.amenouveve-yaveh.com/suppression-compte`
- Dans l’app : **Mon profil** → **Demander la suppression du compte** ; liens aussi sur l’écran de connexion.

## Play Console (saisie manuelle)

- Politique → Contenu de l’application → **Suppression de compte**
- L’application permet-elle de créer un compte ? **Oui**
- URL : `https://clients.amenouveve-yaveh.com/suppression-compte`
- Délai : 30 jours ; conservation des pièces de gestion et de preuve si obligation légale.
