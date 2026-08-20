# Plan de mise à jour des guides utilisateurs

**Périmètre :** application web ELYKIA et parcours mobile décrits dans le site de guides.
**Source de vérité :** changelog `docs/CHANGELOG.md` et composants actifs du frontend.
**Auteur :** Francis AHONSU
**Date de révision :** 20 août 2026

## Objectif

La documentation doit décrire les libellés, actions, droits d’accès et enchaînements réellement proposés par l’interface actuelle. Les pages structurées par profil constituent le contenu canonique du site. Les anciennes pages transversales, les duplicats et les versions imprimables seront soit redirigés vers cette documentation canonique, soit régénérés à partir d’elle afin qu’aucun parcours périmé ne reste accessible.

## Principes de réécriture

Chaque procédure emploiera les libellés visibles dans l’application et indiquera les prérequis de rôle lorsque l’action dépend d’une permission. Les indicateurs financiers ne seront jamais décrits comme accessibles à tous les profils : l’affichage dépend des permissions de KPI de la page. Les actions d’administration et de suppression seront présentées comme conditionnelles aux droits attribués.

Les illustrations ne sont pas inventées. Chaque emplacement important utilisera un commentaire HTML précis, facilement repérable dans la source, par exemple :

```html
<!-- CAPTURE À INSÉRER : Liste des ventes — barre de filtres et actions de la version courante. -->
```

La capture devra représenter un environnement de démonstration, sans donnée client ou donnée financière réelle.

## Matrice de couverture

| Domaine | Évolutions constatées à documenter | Pages canoniques concernées |
|---|---|---|
| Navigation et accès | Menus actuels, sous-menus Caisse, Stock commercial, Stock tontine, Ventes, Tontines, Configuration, Rapport journalier ; affichage conditionnel par rôle. | `index.md`, pages d’accueil par profil |
| Clients | KPI, recherche, filtre commercial, fiche PDF conditionnelle, fiche client, photos, réaffectation par lot, transfert optionnel des ventes en cours. | `commercial/clients_accounts.md`, `manager/operations.md` |
| Ventes et crédit | Vente crédit ou comptant, client et articles paginés, avance, reçu conditionnel, validation, démarrage, encaissement, suivi des retards, échéances, recouvrements et transfert des ventes. | `commercial/sales_orders.md`, `manager/stock_sales.md` |
| Caisse et trésorerie | Ouverture/fermeture de caisse, opération journalière, billetage, versements ventilés et remise au gestionnaire. | `manager/operations.md`, `manager/reporting_config.md` |
| Rapport journalier | Filtres globaux, segments Vue d’ensemble, Journal, Recouvrement, Versements et Remise ; bilans annuels crédit/tontine, export et droits KPI. | `manager/reporting_config.md` |
| Tontine | Session active/historique, inscriptions unitaires ou multiples, collectes normales/rattrapage, contrôles terrain, vérification de carnet, exports PDF, répartition par commercial, livraison. | `commercial/tontine.md`, `manager/finance.md` |
| Stocks et inventaires | Entrée de stock soumise à validation, demandes de sortie, retours, exports PDF, stock mensuel, inventaire physique, réconciliation et clôture. | Guides Magasinier, `commercial/stock.md`, `manager/stock_sales.md` |
| Configuration | Localités, articles, types d’article, types de dépense, paramètres, version V1/V2 de la part société tontine et Mobile Money. | `manager/reporting_config.md`, guide Magasinier des articles |
| Mobile | Commercial : opérations hybride et synchronisation ; chef de recouvrement : plan, retards, terrain, clients et plus. | `commercial/mobile_app.md`, `recovery-manager/mobile.md` |
| Chef de recouvrement | Guide autonome web et mobile : retards, contrôles de carnet, clôtures, rapport de recouvrement, plan de terrain, clients et synchronisation. | `recovery-manager/index.md`, `recovery-manager/web.md`, `recovery-manager/mobile.md` |

## Écarts majeurs corrigés

| Documentation antérieure | Comportement actuel à retenir |
|---|---|
| Une entrée de stock augmente immédiatement le stock. | Une réception est créée en attente, puis doit être validée par un gestionnaire avant son impact métier. Les actions Refuser, Abandonner et Annuler sont conditionnelles au statut et au rôle. |
| Le rapport ne contient qu’un bilan global et un tableau commercial. | Le Rapport journalier utilise une barre de filtres commune et des segments distincts ; les bilans annuels crédit et tontine, le journal, les versements et la remise complètent la vue d’ensemble. |
| La tontine se limite à l’inscription, à la collecte et à la livraison. | Le module inclut session historique en lecture seule, vérification de carnet, export, contrôle terrain, collecte de rattrapage, synthèse mensuelle et répartition des collectes par commercial. |
| Les clients et ventes sont décrits comme des listes simples. | Les listes incluent désormais KPI, filtres persistants, pagination, export, détails, réaffectation sous permission et affichage mobile en cartes. |
| La structure MkDocs pointe vers les guides par profil mais les pages racine sont supposées suffisantes. | Les pages par profil sont retenues comme documentation canonique ; les pages racine deviennent des raccourcis vers elles. |

## Ordre d’exécution

| Étape | Résultat attendu | État |
|---|---|---|
| 1. Réécriture des pages canoniques | Guides Gestionnaire, Magasinier et Commercial cohérents avec le frontend. | Terminé |
| 2. Révision de l’accueil et de la navigation | Navigation MkDocs sans lien cassé et présentation des rôles. | Terminé |
| 3. Traitement des pages historiques | Pages racine converties en raccourcis et versions imprimables régénérées. | Terminé |
| 4. Validation | Contrôle des liens, recherche des anciens libellés et compilation du site. | Terminé |

## Validation effectuée

La compilation MkDocs en mode strict a réussi après la réécriture. Les 18 pages initialement référencées par la navigation ont été contrôlées, 35 emplacements de captures ont été balisés et les récits obsolètes les plus critiques ont été recherchés puis éliminés, notamment l’impact immédiat d’une entrée de stock et l’attribution exclusive de la livraison tontine au magasinier. Le site statique et les trois éditions imprimables ont été régénérés. Une mise à jour complémentaire a ensuite ajouté le profil Chef de recouvrement, ses trois pages canoniques et son édition imprimable.

## Critères d’acceptation

Le travail est terminé lorsque toutes les pages référencées dans `mkdocs.yml` sont à jour, que chaque parcours majeur possède une procédure cohérente, que les captures manquantes sont signalées par un commentaire explicite, et que la génération MkDocs ne signale aucun lien ou fichier absent.
