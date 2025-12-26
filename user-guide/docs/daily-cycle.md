# Gestion du Cycle Journalier

Le respect du cycle journalier est la clé de voute de l'application AMENOUVEVE-YAVEH. Il garantit la cohérence des comptes et la sécurité des fonds.

Ce module détaille les deux niveaux de gestion :
1.  **La Journée Comptable** (Niveau Global - Gestionnaire)
2.  **La Caisse Individuelle** (Niveau Utilisateur - Commercial)

---

## 📅 Gestion de la Journée Comptable
*(Profil requis : Gestionnaire)*

L'écran **Journée comptable** permet de piloter l'ouverture et la fermeture globale de l'activité.

### Accès
Dans le menu principal, cliquez sur **Journée comptable**.

![Capture d'écran - Menu Journée Comptable](images/menu-accounting-day.png)

### 1. Ouvrir la Journée
Le matin, avant toute activité commerciale, le Gestionnaire doit ouvrir la journée.

1.  Vérifiez la **Date comptable** affichée (par défaut, la date du jour).
2.  Cliquez sur le bouton bleu **Ouvrir**.

![Capture d'écran - Écran d'ouverture de journée](images/accounting-day-open.png)

!!! info "Succès"
    Un message de confirmation apparaîtra. Dès cet instant, les commerciaux peuvent ouvrir leurs caisses.

### 2. Suivre l'activité (Caisses Ouvertes)
Une fois la journée ouverte, un tableau **"Caisses Ouvertes"** apparaît en bas de page. Il liste en temps réel :
*   Le nom du **Collecteur** (Commercial).
*   La **Date d'ouverture** de sa caisse.

Cela permet de contrôler qui est "en service".

### 3. Fermer la Journée
Le soir, une fois l'activité terminée, le Gestionnaire clôture la journée.

!!! danger "Pré-requis critique"
    Avant de fermer la journée, **TOUTES les caisses des commerciaux doivent être fermées**.
    Consultez le tableau "Caisses Ouvertes" pour identifier les retardataires.

1.  Vérifiez que le tableau des caisses ouvertes est vide.
2.  Cliquez sur le bouton rouge **Fermer**.

![Capture d'écran - Écran de fermeture de journée](images/accounting-day-close.png)

Cela déclenchera la génération des rapports journaliers et le verrouillage des transactions pour cette date.

---

## 💰 Gestion de la Caisse (Commercial)
*(Profil requis : Commercial, Gestionnaire)*

Chaque utilisateur manipulant de l'argent doit gérer sa propre session de caisse via le menu **Caisse**.

### 1. Ouvrir sa Caisse
Au début de votre tournée ou de votre service :

1.  Accédez au menu **Caisse > Ouvrir Caisse**.
2.  Vous verrez votre nom d'utilisateur affiché.
3.  Cliquez sur le bouton **Ouvrir Caisse**.

![Capture d'écran - Ouverture de caisse commercial](images/cash-desk-open.png)

!!! warning "Blocage"
    Si la **Journée Comptable** n'est pas encore ouverte par le Gestionnaire, vous ne pourrez pas ouvrir votre caisse. Contactez votre superviseur.

### 2. Fermeture de Caisse
À la fin de votre service :

1.  Accédez au menu **Caisse > Ouvrir Caisse** (Le bouton affichera **Fermer Caisse** si vous êtes déjà ouvert).
2.  Cliquez sur **Fermer Caisse**.
3.  Une fenêtre de confirmation apparaîtra : *"Voulez-vous fermer la caisse pour l'utilisateur : [Votre Nom] ?"*.
4.  Confirmez en cliquant sur **Oui, fermer !**.

![Capture d'écran - Confirmation fermeture caisse](images/cash-desk-close-confirm.png)

### 3. Billetage (Comptage des espèces)
*(Optionnel selon procédure interne)*

Avant la fermeture, il est recommandé d'utiliser l'outil de **Billetage** pour compter votre versement.

1.  Allez dans **Caisse > Billetage**.
2.  Saisissez la quantité pour chaque coupure (Billets et Pièces).
3.  Le **Total** se calcule automatiquement.
4.  Utilisez ce total pour vérifier la cohérence avec votre solde théorique.

![Capture d'écran - Écran de billetage](images/billetage.png)
