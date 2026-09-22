# Gestion des articles et seuils de stock (Guide Magasinier)

Le catalogue **Articles** est la base de données centrale de référence pour toutes les opérations de stockage, de réapprovisionnement, de distribution et de tontine. Le magasinier s'y réfère quotidiennement pour contrôler les références, surveiller les seuils d'alerte et préparer les commandes.

---

## 1. Consulter et rechercher dans le catalogue (`/article/list`)

Accessible depuis le menu latéral **Articles** (`ROLE_STOREKEEPER` ou `ROLE_EDIT_ARTICLE`), la liste présente l'ensemble des articles enregistrés.

<!-- CAPTURE À INSÉRER : Catalogue des articles avec recherche dynamique, filtre par type, quantités en stock et boutons de consultation. -->

### A. Outils de recherche et filtres
* **Recherche instantanée** : Recherchez par nom d'article, marque ou modèle.
* **Filtre par Type** : Isolez une catégorie d'articles spécifique (ex: Électroménager, Textile, Téléphonie, etc.).
* **Fiche détaillée de l'article (`/article/details/:id`)** :
  * Cliquez sur **« Voir »** pour afficher la fiche complète.
  * Consultez l'historique chronologique de tous les mouvements de stock ayant affecté cet article (réceptions fournisseurs, sorties vers commerciaux, retours au magasin).

---

## 2. Seuils logistiques et alertes de stock

Pour éviter toute rupture de distribution sur le terrain, chaque article dispose de paramètres de réapprovisionnement surveillés par le système :

| Paramètre Logistique | Rôle dans l'Application | Comportement en cas de franchissement |
|---|---|---|
| **Point de commande** | Seuil critique de sécurité physique (quantité minimale à conserver en réserve). | Dès que le stock réel devient inférieur ou égal à cette valeur, l'article bascule dans la table **« Rupture imminente »** sur le Dashboard d'accueil avec une pastille orange. |
| **Niveau de stock optimal** | Quantité cible recommandée à détenir en réserve pour couvrir l'activité habituelle. | Sert de référence pour calculer le volume des commandes à passer auprès des fournisseurs. |
| **Stock physique (0)** | Quantité nulle en magasin. | L'article bascule dans la table **« Rupture de stock »** avec une pastille rouge d'alerte prioritaire. |

---

## 3. Règle de suppression et archivage

* **Intégrité référentielle** : Il est formellement interdit de supprimer un article qui a déjà fait l'objet d'un mouvement de stock, d'une vente ou d'une distribution.
* En cas d'arrêt de commercialisation d'une référence, modifiez son statut pour le passer à **Inactif** afin qu'il n'apparaisse plus dans les nouveaux formulaires de vente ou de demande de stock, tout en préservant l'historique comptable des opérations passées.

