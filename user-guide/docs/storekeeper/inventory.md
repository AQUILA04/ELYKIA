# Inventaires et entrées de stock

Le menu **Inventaires** réunit la consultation du stock, l’inventaire physique et l’entrée de marchandises. Il ne faut pas confondre une **entrée** avec un **inventaire** : l’entrée enregistre une réception attendue ; l’inventaire compare le stock système au comptage physique.

## Enregistrer une entrée

Dans **Inventaires**, choisissez **Entrées stock**, sélectionnez les articles et saisissez les quantités. Après validation, l’application confirme que l’entrée est enregistrée en attente de validation et redirige vers l’historique des réceptions.

<!-- CAPTURE À INSÉRER : Formulaire Entrée de stock avec sélecteur d’articles et bouton Valider l’entrée. -->

Ouvrez ensuite **Historique Entrée** pour retrouver la référence. Les filtres portent sur la référence, la date et le statut. Le gestionnaire habilité peut valider ou refuser une réception ; l’abandon concerne une réception en attente et l’annulation d’une réception validée reste réservée à la procédure et aux droits concernés.

> **Règle importante.** Une entrée `PENDING` ou en attente ne doit pas être utilisée comme stock disponible. Attendez le statut validé avant de préparer une sortie ou une vente fondée sur cette quantité.

## Réaliser un inventaire physique

Quand aucune session d’inventaire n’est en cours, choisissez **Créer un inventaire**. Lors d’une session active, le panneau d’actions propose le téléchargement du support, la saisie des quantités physiques, la réconciliation des écarts et la clôture, selon le statut et les permissions.

| Étape | Action |
|---|---|
| Préparer | Créer l’inventaire puis télécharger le support si nécessaire. |
| Compter | Relever les quantités physiques article par article. |
| Saisir | Utiliser **Saisir quantités physiques** pour enregistrer le comptage. |
| Analyser | Ouvrir **Réconcilier les écarts** afin d’examiner les différences. |
| Terminer | Clôturer seulement après résolution ou justification des écarts. |

L’**Historique inventaires** et la trajectoire d’un article sont visibles uniquement aux comptes dotés de la permission de consultation correspondante.
