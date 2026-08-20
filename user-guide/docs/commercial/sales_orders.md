# Ventes, crédits et commandes

Le menu **Ventes** rassemble la liste des crédits, les retards, échéances, recouvrements, transferts de ventes et rattrapages selon les permissions. Une vente est une opération suivie par statut ; créez-la correctement avant de solliciter une validation ou une livraison.

## Créer une vente

Dans **Ventes > Liste**, cliquez sur **Nouvelle vente**. Le formulaire permet de choisir le type **Crédit** ou **Comptant**, puis le client et les articles. Pour une vente à crédit, sélectionnez également le commercial et renseignez une avance éventuelle. Si l’option de finalité est active, le crédit peut être déclaré personnel ou professionnel pour les clients habilités.

<!-- CAPTURE À INSÉRER : Formulaire Nouvelle vente avec le sélecteur Crédit / Comptant, Client et Articles. -->

| Type de vente | Données et résultat |
|---|---|
| Crédit | Client, commercial, articles, avance optionnelle ; une mise journalière et un solde sont ensuite suivis. |
| Comptant | Client et articles ; aucun suivi de mise journalière n’est affiché sur le reçu. |

Le sélecteur de client et le sélecteur d’articles utilisent une recherche et un chargement progressif. Saisissez quelques caractères et attendez les résultats plutôt que de conclure qu’un dossier n’existe pas.

## Suivre le cycle du crédit

| Statut | Signification et action courante |
|---|---|
| `CREATED` | Vente enregistrée ; un responsable habilité peut **Valider**. |
| `VALIDATED` | Vente validée ; le magasinier peut **Démarrer** après remise de la marchandise. |
| `INPROGRESS` | Crédit en cours ; l’action **Encaisser** permet la mise, selon les droits. |
| `SETTLED` | Crédit soldé ; il n’est plus sélectionnable pour une réaffectation en lot. |

La liste propose les filtres de période KPI et une **Recherche avancée**. La case de recherche par référence permet de cibler une référence, notamment une référence de rattrapage. La fiche crédit peut afficher le stock mensuel source, l’historique des transferts de commercial et, lorsque le rôle l’autorise, le contrôle terrain.

## Encaissements, retards et transfert

Utilisez **Retards** pour identifier les crédits en retard et **Échéances** pour suivre les périodes dues. Les encaissements apparaissent dans **Recouvrements** ; leur annulation est réservée à une permission spécifique. La liste principale permet de modifier la mise d’un crédit admissible et de réaffecter plusieurs ventes non soldées si le compte dispose de la permission correspondante.

Le menu **Transfert Ventes** est un rapport de passations. Il filtre les commerciaux sortant et entrant ainsi que la période, puis présente les agrégats et le détail paginé. Une vente est comptée une seule fois dans cette lecture, sur la dernière passation pertinente.

## Commandes

Le menu **Commandes** est un parcours distinct, présent uniquement pour les comptes autorisés. Créez, consultez ou mettez à jour une commande dans l’ordre permis par ses statuts. Ne confondez pas une commande avec une vente crédit déjà démarrée.
