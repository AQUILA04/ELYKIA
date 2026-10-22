# Aperçu d’équilibrage du surplus

Branche : `cursor/surplus-dispatch-preview-0518`, à partir de `origin/main`.

## Fenêtre

Le bouton **Équilibrer le surplus** ouvre une fenêtre. Elle affiche le surplus de toute la période filtrée, jour par jour, et chaque jour en manque avec le montant affecté (y compris 0, y compris un jour antérieur au filtre).

- Case **Utiliser le surplus pour les soldes des nouveaux comptes** : décochée à l’ouverture.
- Case **Prioritaire** par jour : ces jours sont servis en premier, du plus ancien au plus récent. Le surplus restant va ensuite aux autres jours, du plus ancien au plus récent.
- Changer une case relance l’aperçu. **Équilibrer** envoie les mêmes choix.

## Partage

Décoché : crédit, puis tontine, puis le jour suivant. Le solde n’est pas une cible ; le surplus continue vers un crédit ou une tontine ailleurs.

Coché : après le crédit et la tontine du jour, le solde de ce jour est couvert, puis les jours suivants.

Les jours déjà constitués en écart de caisse restent exclus.
