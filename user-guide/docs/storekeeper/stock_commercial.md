# Gestion physique du stock (Sorties & Retours)

Le magasinier est l'acteur clé de la délivrance physique des articles aux commerciaux. Aucune marchandise ne doit quitter le magasin sans bon de sortie validé, et aucun retour ne doit être réintégré sans contrôle contradictoire de son état physique.

Le menu **Stock Commercial** regroupe les sorties, le stock et les retours. Sur chaque écran, le sélecteur **Crédit** / **Tontine** (sous le titre) recharge la liste pour le stock choisi.

1. Ouvrez **Stock Commercial**, puis **Demandes Sortie**, **Stock** ou **Retours**.
2. Cliquez sur **Crédit** pour les ventes, ou sur **Tontine** pour les livraisons de fin de cycle.
3. Les filtres, le tableau et les boutons (**Voir**, **Livrer**, **Réceptionner**, **Télécharger**) s'appliquent au choix affiché.

---

## 1. Servir et livrer une demande de sortie (Menu Stock Commercial > Demandes Sortie)

Choisissez **Crédit** sur le sélecteur avant de préparer une sortie de vente.

Toutes les demandes de sortie validées par la gestion arrivent dans le menu **Stock Commercial > Demandes Sortie** (accessible si vous disposez des habilitations requises).

<!-- CAPTURE À INSÉRER : Demande de sortie au statut Validée avec le bouton Livrer visible pour le magasinier. -->

### A. Contrôle avant remise physique
1. Filtrez la liste des demandes par statut ou par commercial pour localiser la commande à préparer.
2. Cliquez sur **« Voir »** pour ouvrir le détail de la demande :
   * La référence s'affiche en haut de la fenêtre.
   * Vérifiez la liste exacte des articles et les quantités commandées.
   * Assurez-vous que le statut est bien **Validée**.
   * Cliquez sur **« Télécharger »** pour enregistrer la fiche de sortie de cette demande.
3. Prélevez les articles en rayon et regroupez-les dans la zone de délivrance.

### B. Remise physique et validation du départ (`Livrer`)
1. Procédez au comptage contradictoire avec le commercial présent au comptoir.
2. Cliquez sur le bouton bleu **« Livrer »**.
3. **Conséquences automatiques** :
   * Le statut de la demande passe définitivement à **Livrée**.
   * Le stock physique du magasin est automatiquement débité.
   * Le stock commercial du destinataire est automatiquement crédité.
   * La date et l'heure précises de livraison sont horodatées.
4. Cliquez sur l'icône de téléchargement pour imprimer la **Fiche de sortie PDF** signée par les deux parties.

> **Consigne absolue.** Ne remettez jamais de marchandise à un commercial sur une demande au statut **Créée / En attente**. Le bouton « Livrer » n'apparaît que sur les demandes expressément validées par la gestion (**Validée**).

---

## 2. Traitement physique des retours d'articles (Menu Stock Commercial > Retours)

Lorsqu'un commercial restitue des articles au dépôt central (invendus de tournée, emballages détériorés, réajustement de dotation), l'opération est traitée dans **Stock Commercial > Retours**, sélecteur **Crédit**.

### A. Réceptionner un retour conforme
1. Le commercial présente les articles au magasin avec son numéro de déclaration de retour.
2. Ouvrez **Stock Commercial > Retours** et identifiez la ligne au statut **En attente**.
3. Vérifiez l'intégrité des produits restitués (état de marche, emballage intact, conformité des références).
4. Si les articles sont conformes, cliquez sur le bouton vert **« Réceptionner »**.
   * Le statut bascule à **Réceptionné**.
   * Le stock central du magasin est réapprovisionné et les articles sont remis en rayon.
   * Le commercial est déchargé de la marchandise.

### B. Refus d'un retour non conforme
* Si un article est détérioré par la faute du commercial ou incomplet, le magasinier ou le gestionnaire clique sur **« Refuser »**.
* Le retour passe au statut **Refusé** : le stock central n'est pas incrémenté et l'article reste sous la responsabilité comptable du commercial jusqu'à règlement du litige.

---

## 3. Sorties et retours tontine (sélecteur Tontine)

À l'approche des fêtes de fin d'année et de la clôture des cycles de cotisation, les commerciaux reçoivent des dotations d'articles destinés aux membres tontine. Ces mouvements se traitent dans le même menu, avec le sélecteur **Tontine**.

<!-- CAPTURE À INSÉRER : Demandes de sortie avec le sélecteur Tontine actif et le bouton Livrer. -->

### A. Délivrance
1. Ouvrez **Stock Commercial > Demandes Sortie**.
2. Cliquez sur **Tontine**.
3. Repérez la demande au statut **Validée**.
4. Cliquez sur **« Voir »** pour examiner les articles et les quantités. La référence s'affiche en haut. **« Télécharger »** enregistre la fiche de cette demande.
5. Rassemblez les colis et vérifiez les références avec le commercial au guichet.
6. Cliquez sur **« Livrer »**.
   * Le stock dépôt tontine est débité.
   * Le commercial est crédité de sa dotation tontine.
   * La demande passe au statut **Livrée**.

La remise au membre se fait ensuite dans le menu **Tontines**, sur la fiche du membre.

### B. Retour
1. Ouvrez **Stock Commercial > Retours** et cliquez sur **Tontine**.
2. Examinez la ligne au statut **En attente**.
3. Après inspection des emballages, cliquez sur **« Réceptionner »** pour réintégrer les articles au stock tontine.

Le suivi des quantités annuelles se fait dans **Stock Commercial > Stock**, sélecteur **Tontine**.

