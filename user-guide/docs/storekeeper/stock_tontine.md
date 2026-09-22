# Gestion physique du stock tontine (Guide Magasinier)

Le module **Stock Tontine** (`/stock-tontine`) applique les mêmes exigences de rigueur logistique que le stock commercial, mais dans un circuit **totalement étanche et isolé**.

---

## 1. Servir une sortie de stock tontine (`/stock-tontine/request`)

À l'approche des fêtes de fin d'année et de la clôture des cycles de cotisation, les commerciaux reçoivent des dotations d'articles pré-commandés par les membres tontine.

<!-- CAPTURE À INSÉRER : Liste des demandes de sortie de stock tontine avec filtres et bouton Livrer pour le magasinier. -->

### A. Contrôle et délivrance physique
1. Ouvrez **Stock Tontine > Demandes Sortie** (`ROLE_STOREKEEPER`).
2. Repérez la demande au statut **`VALIDATED` (Validée)**.
3. Cliquez sur **« Voir »** pour examiner le panier d'articles réservés pour les membres de la zone.
4. Rassemblez les colis correspondants et vérifiez les références avec le commercial au guichet.
5. Cliquez sur le bouton **« Livrer »**.
   * Le stock dépôt est débité du compte tontine.
   * Le commercial est crédité de sa dotation de distribution tontine.
   * La demande passe à **`DELIVERED`**.

> **Distinction fondamentale.** La validation de la sortie par le magasinier décharge le dépôt au profit du commercial. Elle ne marque **PAS** la livraison au client final : c'est le commercial ou le gestionnaire qui actera la remise finale au membre sur la fiche de ce dernier dans le module **Tontines**.

---

## 2. Retours d'articles tontine (`/stock-tontine/return`)

Si un membre tontine a modifié son choix d'article, s'il a dépassé son solde ou si un reliquat de campagne doit être rapatrié au magasin :
1. Le commercial dépose les articles au magasin et initie une déclaration dans **Stock Tontine > Retours**.
2. Le magasinier examine la ligne au statut **`PENDING`**.
3. Après inspection physique des emballages, le magasinier clique sur **« Réceptionner »** pour réintégrer les articles au stock central tontine.

