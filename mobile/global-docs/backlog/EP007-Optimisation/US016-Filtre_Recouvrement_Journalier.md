# US016 - Optimisation de la Liste des Clients à Recouvrer

**Contexte :**

En tant que commercial, je veux que la liste "Clients à Recouvrer" soit plus intelligente et ne m'affiche que les clients pour qui une action de recouvrement est réellement nécessaire aujourd'hui, afin d'optimiser mes tournées et d'éviter les actions redondantes.

**Description de la fonctionnalité :**

Cette fonctionnalité améliore la page "Clients à Recouvrer". Initialement, elle liste les clients ayant un crédit en cours. Cette User Story ajoute deux règles majeures :

1.  La liste est accessible via un menu contextuel sur la page principale des clients pour un accès rapide.
2.  Un client pour lequel un recouvrement a déjà été effectué dans la journée est automatiquement retiré de cette liste jusqu'au lendemain, rendant la liste dynamique et toujours pertinente.

**Règles Métiers :**

*   **RM-OPT-001 :** Un menu contextuel (trois points) doit être présent sur la page "Mes Clients" et contenir un lien "Clients à Recouvrer".
*   **RM-OPT-002 :** La page "Clients à Recouvrer" doit lister uniquement les clients associés au commercial connecté et ayant la propriété `creditInProgress` à `true`.
*   **RM-OPT-003 :** La liste des clients doit être groupée par quartier (`quarter`) pour faciliter l'organisation des tournées.
*   **RM-OPT-004 :** Si un recouvrement a été enregistré pour un client aujourd'hui (en se basant sur la `paymentDate` dans la table `recouvrements`), ce client ne doit PAS apparaître dans la liste "Clients à Recouvrer" pour le reste de la journée.
*   **RM-OPT-005 :** Un clic sur un client dans cette liste doit naviguer vers la page d'enregistrement de recouvrement en passant l'ID de ce client pour pré-remplir le contexte.

**Tests d'Acceptance :**

*   **TA-OPT-001 : Scénario :** Affichage de la liste avant tout recouvrement.
    *   **Given :** Le commercial a des clients avec des crédits en cours et aucun recouvrement n'a été effectué aujourd'hui.
    *   **When :** Le commercial ouvre l'application et navigue vers la page "Clients à Recouvrer".
    *   **Then :** La liste affiche tous ses clients concernés, groupés par quartier.

*   **TA-OPT-002 : Scénario :** Mise à jour dynamique de la liste après un recouvrement.
    *   **Given :** Le commercial est sur la liste "Clients à Recouvrer" et voit le "Client A".
    *   **When :** Le commercial enregistre un recouvrement pour le "Client A" et retourne ensuite à la liste "Clients à Recouvrer".
    *   **Then :** Le "Client A" n'est plus visible dans la liste.

*   **TA-OPT-003 : Scénario :** Réapparition du client le jour suivant.
    *   **Given :** Un recouvrement a été fait hier pour le "Client A", qui n'était donc plus dans la liste.
    *   **When :** Le commercial ouvre l'application le lendemain et navigue vers la liste "Clients à Recouvrer".
    *   **Then :** Le "Client A" est de nouveau visible dans la liste, car son dernier recouvrement date de la veille.
