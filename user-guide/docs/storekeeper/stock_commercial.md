# Gestion physique du stock commercial (Sorties & Retours)

Le magasinier est l'acteur clé de la délivrance physique des articles aux commerciaux. Aucune marchandise ne doit quitter le magasin sans bon de sortie validé, et aucun retour ne doit être réintégré sans contrôle contradictoire de son état physique.

---

## 1. Servir et livrer une demande de sortie (`/stock/request`)

Toutes les demandes de sortie validées par la gestion arrivent dans **Stock Commercial > Demandes Sortie** (accessible si vous disposez des habilitations requises).

<!-- CAPTURE À INSÉRER : Demande de sortie au statut VALIDATED avec le bouton Livrer visible pour le magasinier. -->

### A. Contrôle avant remise physique
1. Filtrez la liste des demandes par statut ou par commercial pour localiser la commande à préparer.
2. Cliquez sur **« Voir »** pour ouvrir le détail de la demande :
   * Vérifiez la liste exacte des articles et les quantités commandées.
   * Assurez-vous que le statut de la ligne est bien **`VALIDATED` (Validée)**.
3. Prélevez les articles en rayon et regroupez-les dans la zone de délivrance.

### B. Remise physique et validation du départ (`Livrer`)
1. Procédez au comptage contradictoire avec le commercial présent au comptoir.
2. Cliquez sur le bouton **« Livrer »** (`data-testid="e2e-stock-request-deliver"`).
3. **Conséquences automatiques** :
   * Le statut de la demande passe définitivement à **`DELIVERED` (Livrée)**.
   * Le stock physique du magasin est automatiquement débité.
   * Le stock commercial du destinataire est automatiquement crédité.
   * La date et l'heure précises de livraison sont horodatées.
4. Cliquez sur l'icône de téléchargement pour imprimer la **Fiche de sortie PDF** signée par les deux parties.

> **Consigne absolue.** Ne remettez jamais de marchandise à un commercial sur une demande au statut `CREATED`. Le bouton « Livrer » n'apparaît que sur les demandes expressément validées par la gestion (`VALIDATED`).

---

## 2. Traitement physique des retours d'articles (`/stock/return`)

Lorsqu'un commercial restitue des articles au dépôt central (invendus de tournée, emballages détériorés, réajustement de dotation), l'opération est traitée dans **Stock Commercial > Retours**.

### A. Réceptionner un retour conforme
1. Le commercial présente les articles au magasin avec son numéro de déclaration de retour.
2. Ouvrez **Stock Commercial > Retours** et identifiez la ligne au statut **`PENDING` (En attente)**.
3. Vérifiez l'intégrité des produits restitués (état de marche, emballage intact, conformité des références).
4. Si les articles sont conformes, cliquez sur le bouton vert **« Réceptionner »** (`data-testid="e2e-stock-return-receive"`).
   * Le statut bascule à **`RECEIVED` (Réceptionné)**.
   * Le stock central du magasin est réapprovisionné et les articles sont remis en rayon.
   * Le commercial est déchargé de la marchandise.

### B. Refus d'un retour non conforme
* Si un article est détérioré par la faute du commercial ou incomplet, le magasinier ou le gestionnaire clique sur **« Refuser »**.
* Le retour passe au statut **`REFUSED`** : le stock central n'est pas incrémenté et l'article reste sous la responsabilité comptable du commercial jusqu'à règlement du litige.

