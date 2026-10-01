# Journal espace client (Audit)

Cette page explique comment consulter le journal des actions réalisées dans l’application **Espace Client** (connexions, parcours, paiements, erreurs).

---

## 1. Accéder au journal

1. Dans le menu latéral, cliquez sur **Audit**.
2. L’écran **Journal espace client** s’ouvre avec les événements des **24 dernières heures** par défaut.
3. Cliquez sur **Actualiser** pour recharger la liste et les indicateurs.

<!-- CAPTURE À INSÉRER : Écran Journal espace client avec KPI et tableau -->

---

## 2. Lire les indicateurs

En haut de page, cinq cartes résument la période filtrée :

- **Événements** : nombre total d’actions enregistrées
- **Erreurs** : problèmes techniques côté application
- **Échecs auth** : connexions ou codes SMS en échec
- **Connexions OK** : connexions réussies
- **Clients distincts** : nombre de clients concernés

---

## 3. Filtrer et rechercher

1. Utilisez les raccourcis de période : **Aujourd’hui**, **24 h**, **7 j**, **30 j**.
2. Utilisez les raccourcis métier : **Erreurs 24 h**, **Auth en échec**, **Paiements / commandes**, **Android**.
3. Affinez avec la recherche (message ou écran), le téléphone, l’identifiant client, la catégorie, la source (Client / Serveur), le résultat, la plateforme ou la version.
4. Cliquez sur **Appliquer**.
5. Cliquez sur **Effacer** pour revenir à la vue des 24 dernières heures.

---

## 4. Consulter un événement

1. Cliquez sur **Voir** sur une ligne.
2. Le panneau de détail affiche la source, le type d’action, le téléphone, l’appareil, la session, le message et les informations techniques utiles au support.
3. Actions possibles depuis le détail :
   - **Voir la session** : reconstitue le parcours chronologique de la session
   - **Filtrer ce device** : ne garde que les événements de cet appareil
   - **Fiche client** : ouvre la fiche du client (si un client est déjà connu)
   - **Copier eventId** : copie la référence pour un ticket support

<!-- CAPTURE À INSÉRER : Panneau détail événement + timeline session -->

---

## 5. Exporter

1. Appliquez les filtres souhaités.
2. Cliquez sur **Export CSV**.
3. Le fichier téléchargé reprend les colonnes principales du tableau. Si le volume dépasse la limite d’export, un message invite à resserrer les filtres.

---

## 6. Cas d’usage fréquents

### Client qui n’arrive pas à se connecter

1. Saisissez son **téléphone**.
2. Choisissez **Auth en échec** ou la période concernée.
3. Ouvrez un événement puis **Voir la session** pour rejouer le parcours.

### Vague d’erreurs après une mise à jour

1. Filtrez sur la **plateforme** et la **version**.
2. Utilisez **Erreurs 24 h**.
3. Regardez les messages et chemins dans le détail.
