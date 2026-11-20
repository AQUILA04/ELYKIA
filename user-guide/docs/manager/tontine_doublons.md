# Doublons de commande et de livraison tontine (Menu Tontines > Doublons)

Sur le terrain, plusieurs personnes utilisent parfois le même compte commercial sur plusieurs téléphones. Quand ces téléphones ne sont pas synchronisés, le même membre peut recevoir une deuxième commande ou une deuxième remise. Le serveur contrôle chaque saisie et garde une trace de toutes les secondes saisies dans ce journal.

## 1. Ce que fait l'application à la seconde saisie

| Situation | Résultat |
|-----------|----------|
| Une commande est déjà enregistrée, pas encore livrée, et le solde prévisionnel du membre couvre les deux commandes | La seconde commande est **ajoutée** à la première. Le membre n'a toujours qu'une seule commande. Si elle était **Validée**, elle repasse **En attente** pour une nouvelle validation, sauf si c'est vous qui avez saisi l'ajout. |
| Une commande est déjà enregistrée, mais le total des deux commandes dépasse le solde prévisionnel | La seconde commande est **refusée**. |
| Le membre est déjà livré | Toute nouvelle commande ou remise est **refusée** : aucun nouveau crédit tontine, aucun reliquat reversé une deuxième fois sur le compte du client. |
| Une commande est déjà enregistrée, et un autre téléphone fait une **Livraison directe** | La livraison directe est **refusée**. La remise doit se faire à partir de la commande existante, sur la fiche du membre. |

Le commercial voit le refus sur son téléphone, avec la référence de la commande déjà enregistrée. Si le téléphone était hors ligne, le refus apparaît à la synchronisation.

Le reçu imprimé par le second téléphone pour une commande ajoutée reste vérifiable avec **Vérifier un reçu** (page **Tontines > Livraison**) : le contrôle confirme qu'il est authentique et affiche la commande complète.

## 2. Consulter le journal

1. Dans le menu latéral gauche, cliquez sur **Tontines** puis sur **Doublons**.
2. Les indicateurs en haut de page donnent le nombre de doublons de la période, puis, pour la page affichée, le nombre de saisies refusées, leur montant et le nombre de saisies ajoutées.
3. Filtrez si besoin :
   - **Commercial** : un seul commercial.
   - **Issue** : **Toutes**, **Refusées** ou **Ajoutées**.
   - **Période** : **Aujourd'hui**, **7 jours**, **Mois** ou **Année**.
4. Chaque ligne indique :
   - la **date** de la seconde saisie (et le nombre de tentatives quand le téléphone l'a renvoyée plusieurs fois) ;
   - le **client** et le **commercial**, avec l'appareil quand il est connu ;
   - la **seconde saisie** : commande, livraison directe ou remise de la commande, sa référence et son montant ;
   - les **articles** de la seconde saisie ;
   - ce qui était **déjà enregistré** : référence, montant et solde disponible du membre au moment du contrôle ;
   - l'**issue** : **Ajoutée** ou **Refusée**, avec le motif.
5. Cliquez sur **Voir** pour ouvrir la fiche du membre.

## 3. Que faire d'une saisie refusée

Une remise refusée signifie souvent que les articles ont déjà été remis une seconde fois au client sur le terrain.

1. Ouvrez la fiche du membre avec **Voir** et vérifiez la commande enregistrée.
2. Rapprochez les articles de la ligne refusée avec le stock tontine du commercial : ces articles manquent dans son stock sans figurer sur une livraison.
3. Faites récupérer les articles auprès du client, ou régularisez avec le commercial selon les règles de l'agence.
