# Gestion des articles et seuils de stock (Guide Magasinier)

Le catalogue **Articles** est la base de données centrale de référence pour toutes les opérations de stockage, de réapprovisionnement, de distribution et de tontine. Le magasinier s'y réfère quotidiennement pour contrôler les références, surveiller les seuils d'alerte et préparer les commandes.

---

## 1. Consulter et rechercher dans le catalogue (Menu Articles > Liste)

Accessible depuis le menu latéral gauche **Articles** (si vous ne voyez pas ce menu, vous ne disposez pas des habilitations requises), la liste présente l'ensemble des articles enregistrés.

<!-- CAPTURE À INSÉRER : Catalogue des articles avec recherche dynamique, filtre par type, quantités en stock et boutons de consultation. -->

### A. Outils de recherche et filtres
* **Recherche instantanée** : Recherchez par nom d'article, marque ou modèle.
* **Filtre par Type** : Isolez une catégorie d'articles spécifique (ex: Électroménager, Textile, Téléphonie, etc.).
* **Fiche détaillée de l'article** :
  * Cliquez sur **« Voir »** pour afficher la fiche complète.
  * Consultez l'historique chronologique de tous les mouvements de stock ayant affecté cet article (réceptions fournisseurs, sorties vers commerciaux, retours au magasin).
* **Photo** : la liste affiche une miniature à côté du nom lorsqu'une photo est disponible.

## Photo de l'article

1. Ouvrez **Articles**, puis **Ajouter**, ou le crayon de modification d'un article existant.
2. Dans **Photo**, cliquez sur **Choisir une photo** et sélectionnez l'image du produit (5 Mo maximum).
3. L'aperçu s'affiche. **Retirer** enlève la photo de cet article.
4. Enregistrez. La photo est réduite automatiquement.

Si l'article n'a pas encore sa photo, l'aperçu reprend celle de son type lorsqu'elle existe. Le catalogue de l'espace client affiche la même image.

## Colis et demi-gros

1. Sur la fiche, choisissez **Carton** ou **Sac**, puis le nombre d'unités du colis. Ce nombre peut être impair.
2. S'il est impair, le champ **Unités du demi-gros** apparaît. Laissez-le vide s'il n'y a pas de demi-gros. Sinon, indiquez combien d'unités il contient.
3. Le prix d'achat du demi-gros et son prix de vente ne s'affichent que si le demi-gros est défini.
4. Vous pouvez ajouter des offres de vente, par exemple 3 unités pour 250. Le montant est celui des 3 unités.
5. À l'entrée de stock, le demi-gros n'est proposé que s'il est défini. Le gros reste possible même si le colis est impair. Les prix de vente du lot sont préremplis et modifiables pour cette entrée.

---

## 2. Seuils logistiques et alertes de stock

Pour éviter toute rupture de distribution sur le terrain, chaque article dispose de paramètres de réapprovisionnement surveillés par le système :

| Paramètre Logistique | Rôle dans l'Application | Comportement en cas de franchissement |
|---|---|---|
| **Point de commande** | Seuil critique de sécurité physique (quantité minimale à conserver en réserve). | Dès que le stock réel devient inférieur ou égal à cette valeur, l'article bascule dans la table **« Rupture imminente »** sur le Dashboard d'accueil avec une pastille orange. |
| **Niveau de stock optimal** | Quantité cible recommandée à détenir en réserve pour couvrir l'activité habituelle. | Sert de référence pour calculer le volume des commandes à passer auprès des fournisseurs. |
| **Stock physique (0)** | Quantité nulle en magasin. | L'article bascule dans la table **« Rupture de stock »** avec une pastille rouge d'alerte prioritaire. |

Sur l'accueil, dans **Alertes stock magasin**, chaque ligne affiche le nom commercial suivi du nom de l'article.

1. Ouvrez **Accueil**.
2. À droite du titre **Rupture de stock**, cliquez sur l'icône de téléchargement : le fichier reprend le nom commercial, le nom, le type et la quantité de chaque article indisponible.
3. À droite du titre **Rupture imminente**, cliquez sur l'icône de téléchargement : le fichier reprend les mêmes informations pour les articles sous le seuil d'alerte.

---

## 3. Règle de suppression et archivage

* **Intégrité référentielle** : Il est formellement interdit de supprimer un article qui a déjà fait l'objet d'un mouvement de stock, d'une vente ou d'une distribution.
* En cas d'arrêt de commercialisation d'une référence, modifiez son statut pour le passer à **Inactif** afin qu'il n'apparaisse plus dans les nouveaux formulaires de vente ou de demande de stock, tout en préservant l'historique comptable des opérations passées.

