# Application mobile de terrain

L’application mobile propose un parcours commercial et un parcours dédié au chef de recouvrement. Elle privilégie l’écriture en ligne lorsque le serveur est joignable, avec possibilité d’enregistrer hors ligne lorsque l’interface le propose. La synchronisation reste indispensable pour remonter les opérations locales.

## Parcours commercial

Après connexion, le chargement initial prépare les données nécessaires aux onglets de travail. Les parcours disponibles incluent les clients, distributions, recouvrements, stock, commandes, tontine, rapport et synchronisation, selon le compte connecté.

| Action | Comportement à retenir |
|---|---|
| Créer ou modifier un client | Tentative en ligne en priorité ; l’application peut proposer un enregistrement hors ligne en cas d’indisponibilité. |
| Distribution et encaissement | Tentative en ligne puis repli local proposé selon l’erreur rencontrée. |
| Tontine | Inscription, collecte et livraison suivent la même logique hybride ; les collectes locales sont synchronisées ultérieurement. |
| Synchroniser | Les pages de synchronisation manuelle, automatique et d’erreurs permettent de contrôler les opérations en attente. |

<!-- CAPTURE À INSÉRER : Onglet Plus de l’application mobile commerciale avec l’état de synchronisation et les actions disponibles. -->

Une collecte tontine hors ligne peut afficher une estimation. Après reconnexion, lancez la synchronisation et vérifiez que l’opération a bien quitté la file d’attente avant de la considérer comme définitive.

## Parcours chef de recouvrement

Le profil Chef de recouvrement dispose d’un espace terrain distinct, accessible après le plan du jour, avec les onglets **Retards**, **Terrain**, **Clients** et **Plus**. Son parcours complet — contrôles de carnet, clôtures, réaffectations, pack hors ligne et synchronisation — est documenté dans le [Guide Chef de recouvrement](../recovery-manager/mobile.md).

## Sécurité et mise à jour

Après une réinitialisation de mot de passe, le changement est obligatoire avant de poursuivre. Si la gestion d’appareils mobiles est activée par l’organisation, seuls les appareils autorisés peuvent se connecter. La page **Plus** peut afficher la version installée et le bouton **Mettre à jour l’application** ; installez uniquement les mises à jour proposées par l’application ou par la procédure officielle de l’organisation.
