# Stock commercial (Demandes, Suivi Mensuel & Retours)

Le **Stock Commercial** représente la marchandise physique effectivement confiée à un agent commercial pour réaliser ses ventes sur le terrain. L'agent est personnellement et financièrement comptable des articles mis à sa disposition jusqu'à leur vente enregistrée ou leur réintégration au magasin central.

---

## 1. Demander du stock au magasin (Menu Stock Commercial > Demandes Sortie)

Pour s'approvisionner, le commercial ou son responsable initie une **Demande de sortie stock**.

Sous le titre de **Demandes Sortie**, **Stock** et **Retours**, le sélecteur **Crédit** / **Tontine** affiche soit le stock des ventes, soit le stock des livraisons tontine. Cliquez sur le choix voulu avant de créer une demande, de consulter le stock ou d'enregistrer un retour.

<!-- CAPTURE À INSÉRER : Formulaire Nouvelle demande de sortie stock avec sélection des articles, quantités et bouton d'envoi. -->

### A. Création de la demande (Bouton + Nouvelle demande)
1. Dans le menu latéral gauche, ouvrez **Stock Commercial > Demandes Sortie** et cliquez sur le bouton bleu **« + Nouvelle demande »** (si ce bouton n'apparaît pas, vous ne disposez pas des habilitations requises). En tant que commercial, vous visualisez uniquement vos propres demandes ; en tant que gestionnaire, vous avez la visibilité sur l'ensemble des commerciaux de l'agence.
2. Sélectionnez le commercial destinataire (pré-rempli à votre nom pour un commercial).
3. Ajoutez les articles souhaités dans la grille et indiquez pour chacun la quantité requise.
4. Cliquez sur **« Enregistrer »**.
5. Sur la liste, cliquez sur **« Voir »** : la référence s'affiche en haut, avec les articles et les quantités. **« Télécharger »** enregistre la fiche de cette demande.

### B. Cycle de vie de la demande
* **Statut En attente (Créée)** :
  * La demande est enregistrée et transmise pour arbitrage.
  * Tant qu'elle n'est pas validée, le commercial ou le gestionnaire peut la **Modifier** (icône crayon) ou l'**Annuler** (icône croix rouge).
  * Le gestionnaire peut la **Valider** (icône coche verte) ou la **Refuser**.
* **Statut Validée** :
  * Le gestionnaire a autorisé la sortie. La demande est transmise au magasin dépôt.
  * Les articles sont physiquement préparés par le magasinier.
* **Statut Livrée** :
  * Le magasinier remet la marchandise au commercial et clique sur **« Livrer »**.
  * **Effet immédiat** : Les articles sont instantanément crédités dans le **Stock Mensuel** du commercial. La date et l'heure de remise physique sont figées.

---

## 2. Stock commercial mensuel (Menu Stock Commercial > Stock)

Le menu **Stock Commercial > Stock** ouvre le stock du mois. Un gestionnaire voit toute l'équipe ; un commercial arrive directement sur **sa fiche**.

La première fois, une **visite guidée** présente l'écran. Le bouton **Visite guidée** la relance. Le lien **Ancienne présentation**, en haut de l'écran, ouvre l'ancien tableau de bord par panneaux mensuels ; un lien **Nouvelle présentation** permet d'y revenir.

<!-- CAPTURE À INSÉRER : vue équipe du stock commercial avec les deux flux et le tableau par commercial. -->

### A. Vue équipe
* **Mois** : les flèches ‹ › passent au mois précédent ou suivant. Le mois en cours indique dans combien de jours il est clôturé. Les mois passés remplacent l'ancien bouton **Historique**.
* **Crédit / Tontine** : bascule entre le stock crédit (mensuel) et le stock tontine (annuel, voir plus bas).
* **Commercial** et **filtres** : **Avec stock restant**, **Avec dette**, **Recouvrement < 50 %**.
* **Mois clôturés à régulariser** : un bandeau orange liste les mois passés dont un reste n'est ni vendu, ni retourné, ni transformé en dette. Un clic ouvre la régularisation (section C).
* **Deux flux** :
  * **Marchandise** : pris = vendu + retourné + en dette + restant (en valeur de vente).
  * **Argent** : total dû (vendu + dette + restant) − recouvré = **reste à recouvrer**. Le recouvré compte les encaissements des ventes et la dette marchandise déjà réglée.
* **Une ligne par commercial**, triée par reste à recouvrer. Cliquez sur une ligne pour ouvrir la fiche.

### B. Fiche d'un commercial
* **En-tête** : commercial et mois, taux de recouvrement, boutons commercial précédent / suivant, **Ventes liées**, **Régularisation** (mois passé avec un reste ou une dette), **Voir la dette**, **Télécharger le rapport** (PDF).
* **Flux Marchandise** (en quantités) et **Argent** (en valeur) du commercial.
* **Articles** : par défaut, seuls les articles **À suivre** (avec un reste ou une dette) sont affichés ; **Tous** montre aussi les articles entièrement vendus. Le champ de recherche filtre par nom.
* **Détail ›** ouvre le panneau de l'article :
  * **Mouvements** : entrées, ventes et retours, avec les quantités avant / après ;
  * **Ventes** : date, crédit, client, quantité, prix moyen (PMP) et montant de chaque vente ;
  * **Valorisation** : total vendu du stock, somme des ventes valorisées, et un contrôle **Concordant** ou **Écart à expliquer**.
* **Ventes liées** ouvre le panneau des crédits qui ont débité ce stock (rattrapages compris) : montant, montant imputé au stock, **payé**, **reste client**, statut. Les filtres **En cours** / **Soldées** et la recherche (client ou référence) aident à retrouver une vente. L'encart vert **Concordant** confirme que le stock vendu correspond aux ventes imputées ; en cas d'écart, il passe en orange avec le montant.

Le lien « stock source » du détail d'un crédit ouvre directement la fiche, panneau **Ventes liées** ouvert.

### C. Régulariser un mois clôturé
Après la fin du mois, ce qui reste chez le commercial doit être **retourné au magasin** ou **transformé en dette**. Ouvrez **Régularisation** depuis la fiche, ou un mois du bandeau orange de la vue équipe.

1. **Cycle du mois** : cinq étapes (sorties magasin, ventes et retours, clôture, régularisation du reste, dette soldée). L'étape en cours est en orange.
2. **Reste à régulariser** : chaque article restant, valorisé au prix moyen de vente arrondi au franc supérieur. C'est le montant de la future dette.
3. Choisissez :
   * **Enregistrer un retour en magasin** : ouvre le retour sur mois antérieur, commercial et mois déjà choisis. Le retour n'est plus possible une fois la dette constituée.
   * **Constituer la dette** (profil « gestion des dettes ») : les quantités restantes passent en **Dette**. Une seule dette par mois et par commercial.
4. **Dette marchandise** : montant, réglé, reste à payer. Pour enregistrer un règlement, choisissez **Espèces**, **Avoir (surplus)** (le montant disponible est affiché) ou **Abandon** (motif obligatoire), indiquez le montant (paiement partiel possible), puis **Valider le règlement**.
5. **Annuler la dette** n'est proposé que tant qu'aucun règlement n'est enregistré.

### D. Les dettes
Voir la page dédiée [Vos dettes](debts.md).

---

## 3. Retours de marchandise au magasin (Menu Stock Commercial > Retours)

Lorsqu'un commercial souhaite réintégrer un article invendu, défectueux ou faire une fin de tournée, il crée une opération de retour dans **Stock Commercial > Retours**.

### A. Déclaration du retour (Bouton + Nouveau retour)
1. Cliquez sur le bouton bleu **« + Nouveau retour »**.
2. Sélectionnez le commercial, l'article et la quantité à restituer.
3. Renseignez obligatoirement le **motif du retour** (invendu, emballage détérioré, demande du client annulée).
4. Enregistrez. Le retour passe au statut **En attente**.

### B. Réception magasin
* Le magasinier vérifie l'état physique de l'article au dépôt.
* Dès que le magasinier clique sur **« Réceptionner »**, le statut bascule à **Réceptionné**.
* **Impact comptable immédiat** : Le stock commercial de l'agent est automatiquement déchargé de la quantité retournée, et le stock central du magasin est réapprovisionné.

---

## 4. Retour de stock antérieur (Bouton Retour stock antérieur)

Pour les situations où des articles confiés lors d'un mois civil antérieur doivent être restitués plusieurs semaines après la clôture du mois d'origine :
* Le bouton **« Retour stock antérieur »** (accessible sous réserve de disposer des habilitations requises) permet d'enregistrer un retour rattaché spécifiquement au mois d'origine de la dotation.
* Cela garantit que les bilans mensuels d'ouverture et de clôture ne subissent aucun décalage d'imputation comptable.

