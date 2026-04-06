
---

# Document de Conception : Refonte du Calcul du Prix de Stock Commercial

## 1. État des Lieux et Problématique

Le système actuel de gestion du stock pour les commerciaux utilise un calcul de **Prix Moyen Pondéré (PMP)** basé sur le cumul mensuel net.

### Le Problème Mathématique

Lorsqu'un commercial reçoit de nouvelles quantités à des prix différents à des dates différentes, le mélange des stocks anciens (déjà vendus) et des nouveaux stocks fausse la moyenne.

**Exemple concret :**

1. **Entrée 1 :** 10 unités à 600 FCFA. (Total : 6000, Stock : 10, PMP : 600).
2. **Vente :** 5 unités sont vendues à 600 FCFA. (**Reste : 5 unités**).
3. **Entrée 2 :** 10 unités à 700 FCFA.
4. **Calcul Actuel :** (6000 + 7000) / (10 + 10) = 650 FCFA.
5. **Incohérence :** Si on vend les 15 unités restantes à 650, on obtient 9750 FCFA. Ajouté aux 3000 déjà encaissés, le total est de 12750 FCFA, alors que la valeur réelle sortie du magasin était de 13000 FCFA. **Perte factice de 250 FCFA.**

### Le Problème des Retours

Si un commercial rend des articles alors que le PMP a été lissé sur le mois, la valeur monétaire du retour ne correspond plus à la valeur d'origine, créant des écarts de caisse lors du rapprochement final.

---

## 2. Analyse des Contraintes Techniques

Trois options ont été envisagées, avec une contrainte majeure : **L'application mobile fonctionne en mode "Offline First".**

| Solution | Avantages | Inconvénients | Verdict |
| --- | --- | --- | --- |
| **FIFO (Premier entré, premier sorti)** | Précision comptable absolue. | Trop complexe à gérer sans connexion (gestion de lots sur le mobile). | **Écartée** |
| **PMP Mensuel (Actuel)** | Simple. | Mathématiquement faux dès qu'il y a des ventes entre deux approvisionnements. | **Écartée** |
| **PMP Glissant sur Stock Résiduel** | Précis, gère le offline, évite les pertes de marge. | Demande de stocker la quantité réelle en main. | **Retenue** |

---

## 3. Solution Recommandée : PMP Glissant sur Stock Résiduel

La solution consiste à calculer le nouveau prix moyen **uniquement sur les quantités physiquement présentes** dans le sac du commercial au moment de l'ajout.

### A. Modifications du Modèle de Données (`CommercialMonthlyStockItem`)

Il faut distinguer le **cumul statistique** (pour les rapports) de l'**état actuel** (pour le calcul du prix).

Ajouter ces champs :

* `unitPrice` (Double) : Le prix moyen pondéré actuel des articles restants.
* `currentStockQuantity` (Integer) : La quantité réelle actuellement détenue par le commercial.

### B. Algorithme de mise à jour

#### 1. Lors d'un Approvisionnement (Sortie Magasin vers Commercial)

Quand le commercial reçoit $Q_{nouvelle}$ au prix $P_{nouvelle}$ :

1. **Valeur actuelle du sac** = `currentStockQuantity` × `unitPrice`.
2. **Valeur de l'apport** = $Q_{nouvelle}$ × $P_{nouvelle}$.
3. **Nouveau PMP** = (Valeur actuelle + Valeur apport) / (`currentStockQuantity` + $Q_{nouvelle}$).
4. **Mise à jour :**
* `unitPrice` = Nouveau PMP.
* `currentStockQuantity` += $Q_{nouvelle}$.
* `quantity` (cumul) += $Q_{nouvelle}$.



#### 2. Lors d'une Vente (Sur le Mobile)

Le mobile utilise le `unitPrice` synchronisé.

1. Le prix de vente est fixé au `unitPrice` actuel.
2. Lors de la synchro, le backend fait : `currentStockQuantity` -= $Q_{vendue}$.
3. **Le `unitPrice` ne change pas.**

#### 3. Lors d'un Retour (Commercial vers Magasin)

1. Le commercial rend $Q_{retour}$.
2. On les retire au prix moyen actuel :
* `currentStockQuantity` -= $Q_{retour}$.
* `returned` (cumul) += $Q_{retour}$.


3. **Le `unitPrice` ne change pas.**

---

## 4. Avantages de cette structure

1. **Zéro Écart de Réconciliation :** Le prix affiché sur le mobile (et imprimé sur le reçu) est identique à celui utilisé par le backend pour calculer la marge.
2. **Indépendance Offline :** Le commercial part le matin avec un prix "bloqué" pour la journée. Même s'il vend 100 articles en zone morte, le calcul reste juste.
3. **Réalité Financière :** Les articles déjà vendus et encaissés ne "polluent" plus le prix des articles restants.
4. **Simplicité de mise en œuvre :** Pas besoin de gérer des identifiants de lots (batches) complexes entre le mobile et le serveur.

---

## 5. Plan d'Action (Développement)

1. **Migration DB :** Ajouter `unit_price` et `current_stock_quantity` à la table `commercial_monthly_stock_item`.
2. **Initialisation :** Faire un script pour remplir `current_stock_quantity` avec `(quantity - sold - returned)` actuel.
3. **Code :** Modifier `StockReturnService.updateCommercialMonthlyStock` pour appliquer la formule du PMP sur stock résiduel.
4. **Sync :** Vérifier que l'API envoyant les données au mobile inclut bien ce `unitPrice` mis à jour.