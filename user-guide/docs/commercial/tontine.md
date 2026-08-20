# Tontines

Le module **Tontines** suit les membres, collectes, livraisons et archives de collectes. Les actions d’écriture concernent la session active ; une session historique est affichée en lecture seule.

## Tableau de bord de la session

Dans **Tontines > Liste**, choisissez la session puis utilisez les filtres pour limiter les membres par recherche, commercial, localité ou statut de carnet. Le tableau peut fournir les exports PDF par commercial et, pour les comptes habilités, les exports de carnets vérifiés ou à vérifier. Les boutons **Ajouter un Membre** et **Ajout Multiple** sont indisponibles en session historique ou pendant un recalcul de part société.

<!-- CAPTURE À INSÉRER : Gestion des Tontines avec sélecteur de session, filtres, Ajout Multiple et barre de vérification de carnet. -->

La vérification en masse s’effectue en sélectionnant les membres puis en choisissant **Vérifier la sélection**. Sur la fiche membre, le badge précise `Carnet vérifié` ou `Carnet non vérifié`, ainsi que la date et l’auteur lorsqu’une vérification existe. Cette action est réservée à la permission dédiée ; elle peut être annulée par les mêmes comptes habilités.

## Inscrire et modifier un membre

Utilisez **Ajouter un Membre** pour sélectionner un client et définir sa mise. L’ajout multiple permet de créer plusieurs inscriptions quand le rôle le permet. Ouvrez ensuite une ligne pour consulter la fiche : montant contribué, solde disponible, part société, collectes à la livraison, progression des mois et historique des montants de mise.

## Enregistrer une collecte

Sur la fiche membre active, choisissez **Enregistrer une Collecte** pour une collecte normale ou **Collecte de rattrapage** pour une date antérieure à aujourd’hui. Le rattrapage demande de vérifier le mois ciblé et la mise journalière applicable avant confirmation. Le récapitulatif mensuel et l’historique des collectes se mettent à jour après l’enregistrement.

| Écran de contrôle | Ce qu’il permet de vérifier |
|---|---|
| Cotisations par commercial | Répartition des collectes selon l’agent qui les a réellement enregistrées ; le commercial actuel est signalé. |
| Synthèse mensuelle | Nombre de collectes, montant et équivalent en jours de mise. |
| Historique des montants de mise | Montant journalier applicable par période. |
| Contrôle terrain | Comparaison système, carnet et écart, lorsque le chef de recouvrement a saisi un contrôle. |

L’annulation d’une collecte est réservée aux comptes autorisés et peut être limitée au profil administrateur. Ne corrigez pas une collecte par une nouvelle collecte inverse sans suivre la procédure interne.

## Préparer et finaliser une livraison

Lorsque la session est fermée et que le statut de livraison le permet, utilisez **Préparer la Livraison** pour choisir les articles. Le dossier passe alors en `PENDING`. Un gestionnaire ou administrateur autorisé utilise **Valider la Livraison** ; ensuite, un compte autorisé par le rôle rapport ou édition tontine peut **Marquer comme Livré**. La fiche affiche alors les articles, le montant, la date, le commercial et le solde non utilisé éventuel.

> La livraison n’est pas réservée au seul magasinier : l’action est disponible selon les permissions `ROLE_REPORT` ou `ROLE_EDIT_TONTINE` de l’application actuelle.
