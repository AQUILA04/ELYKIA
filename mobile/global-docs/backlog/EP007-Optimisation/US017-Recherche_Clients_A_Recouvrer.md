# US017 - Recherche dans la Liste des Clients à Recouvrer

**Contexte :**

En tant que commercial, lorsque je consulte la liste des clients à recouvrer, je veux pouvoir rechercher rapidement un client ou un quartier spécifique pour accéder plus vite à l'information dont j'ai besoin.

**Description de la fonctionnalité :**

Cette fonctionnalité ajoute une barre de recherche à la page "Clients à Recouvrer". La recherche est "intelligente" : elle permet de filtrer la liste soit par nom de client, soit en isolant un quartier complet.

**Règles Métiers :**

*   **RM-SRCH-001 :** Une barre de recherche doit être visible en haut de la page "Clients à Recouvrer".
*   **RM-SRCH-002 :** Si le texte saisi dans la barre de recherche correspond exactement (insensible à la casse) à un nom de quartier, la liste ne doit afficher que le groupe de ce quartier avec tous ses clients.
*   **RM-SRCH-003 :** Si le texte saisi ne correspond pas à un nom de quartier, il doit être utilisé pour filtrer les clients par leur nom (`fullName`) à l'intérieur de chaque groupe.
*   **RM-SRCH-004 :** Les groupes de quartiers qui deviennent vides après le filtrage des clients ne doivent pas être affichés.
*   **RM-SRCH-005 :** Si la barre de recherche est vide, la liste complète et non filtrée des clients à recouvrer doit être affichée.

**Tests d'Acceptance :**

*   **TA-SRCH-001 : Scénario :** Recherche par nom de client.
    *   **Given :** La liste des clients à recouvrer est affichée avec plusieurs quartiers.
    *   **When :** Le commercial tape une partie du nom d'un client, par exemple "Dupont".
    *   **Then :** La liste se met à jour et n'affiche que les clients dont le nom contient "Dupont", tout en conservant leur groupement par quartier. Les quartiers sans correspondance sont masqués.

*   **TA-SRCH-002 : Scénario :** Recherche exacte par nom de quartier.
    *   **Given :** La liste contient les quartiers "Centre-ville" and "La Plaine".
    *   **When :** Le commercial tape "centre-ville" dans la barre de recherche.
    *   **Then :** La liste se met à jour et n'affiche que le groupe "Centre-ville" avec tous les clients de ce quartier. Le groupe "La Plaine" est masqué.

*   **TA-SRCH-003 : Scénario :** Effacement de la recherche.
    *   **Given :** Une recherche est actuellement active et la liste est filtrée.
    *   **When :** Le commercial efface le contenu de la barre de recherche.
    *   **Then :** La liste complète de tous les clients à recouvrer, groupée par quartier, est de nouveau affichée.
