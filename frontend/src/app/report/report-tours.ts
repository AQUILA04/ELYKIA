import { TourDefinition } from '../shared/report-ui/guided-tour/guided-tour.service';

/** Visite du cockpit équipe (première ouverture de /report/daily). */
export const COCKPIT_TOUR: TourDefinition = {
    id: 'report-cockpit',
    version: 1,
    steps: [
        {
            title: 'Bienvenue dans le nouveau rapport',
            body: 'Le rapport journalier change de présentation. Un seul écran montre maintenant toute l\'équipe : '
                + 'ce qui a été encaissé, ce qui a été versé, et qui doit encore de l\'argent.\n'
                + 'Cette visite dure une minute. Vous pouvez la relancer avec le bouton « Visite guidée ».'
        },
        {
            target: 'filters',
            title: 'Période et commercial',
            body: 'Choisissez Aujourd\'hui, Semaine, Mois ou des dates précises, et éventuellement un commercial. '
                + 'Ces filtres suivent l\'utilisateur sur tous les écrans du rapport (fiche, versements, journal).'
        },
        {
            target: 'kpis',
            title: 'Les 4 chiffres à lire en premier',
            body: 'Dû à la caisse → Versé → Reste à verser → Taux de versement.\n'
                + 'Le « Dû à la caisse » additionne l\'« A Verser » de la période et les rattrapages saisis '
                + 'pour des jours passés. Si le Reste à verser est à 0, tout l\'argent est rentré.'
        },
        {
            target: 'alerts',
            title: 'Les points d\'attention',
            body: 'Les écarts sont listés du plus gros montant au plus petit : argent non versé, rattrapages '
                + 'non versés, surplus à équilibrer, manquants antérieurs. Un clic ouvre directement le bon écran.'
        },
        {
            target: 'team',
            title: 'Une ligne par commercial',
            body: 'Le tableau remplace les grandes grilles de tuiles par commercial. Les commerciaux en retard '
                + 'sont en haut. La colonne Écart indique ce qui manque (−) ou ce qui a été versé en trop (+).\n'
                + 'Cliquez sur une ligne pour ouvrir la fiche du commercial.'
        },
        {
            target: 'catchups',
            title: 'Rattrapages et tontine : deux colonnes',
            body: 'La colonne Tontine ne compte que les cotisations de la période. La colonne Rattrapages compte '
                + 'les cotisations de jours passés saisies pendant la période. Elles ne sont jamais comptées deux fois.'
        },
        {
            target: 'cash',
            title: 'La caisse',
            body: 'Total encaissé de toutes les caisses, dépenses hors approvisionnement et solde de caisse, '
                + 'comme dans l\'ancienne « Synthèse caisse ».'
        },
        {
            target: 'portfolio',
            title: 'Le portefeuille de l\'année',
            body: 'Le bilan crédit de l\'année pour toute l\'équipe : portefeuille confié, versé, reste chez les clients. '
                + 'Il ne dépend pas de la période choisie.'
        },
        {
            target: 'nav',
            title: 'Versements et journal',
            body: '« Versements » liste chaque dépôt ventilé par compte, avec les surplus à équilibrer. '
                + '« Journal » liste toutes les opérations de la période, avec un total par type.'
        },
        {
            target: 'classic',
            title: 'Où sont passées mes tuiles ?',
            body: 'Tout est toujours là : les tuiles « A Verser (Crédit / Tontine / Solde Nx) » deviennent les colonnes '
                + 'du tableau et la fiche commercial ; « Versé » et « Reste » sont les colonnes Versé et Écart.\n'
                + 'Si vous préférez, « Ancienne présentation » ouvre l\'écran que vous connaissez, avec les mêmes filtres.'
        },
        {
            target: 'help',
            title: 'Revoir la visite',
            body: 'Ce bouton relance la visite à tout moment. Bon pilotage !'
        }
    ]
};

/** Visite de la fiche commercial. */
export const SHEET_TOUR: TourDefinition = {
    id: 'report-commercial-sheet',
    version: 1,
    steps: [
        {
            target: 'equation',
            title: 'Le rapprochement en une ligne',
            body: 'Crédit + Tontine + Solde Nx + Rattrapages saisis = Dû à la caisse. '
                + 'On retire ce qui a été versé : il reste l\'argent encore chez le commercial.'
        },
        {
            target: 'activity',
            title: 'L\'activité par domaine',
            body: 'Crédit, Tontine et Clients regroupent les compteurs de l\'ancien écran '
                + '(ventes, recouvrements, collectes, rattrapages, livraisons, nouveaux clients).'
        },
        {
            target: 'trend',
            title: '7 derniers jours',
            body: 'Chaque jour, la barre claire montre ce qui était à verser, la barre foncée ce qui a été versé. '
                + 'Une barre foncée plus courte signale un retard.'
        },
        {
            target: 'yearly',
            title: 'Les bilans de l\'année',
            body: 'Bilan crédit et bilan tontine de l\'année, chargés quand vous arrivez sur cette section. '
                + '« Reste chez les clients » ouvre le détail par crédit.'
        },
        {
            target: 'sheet-nav',
            title: 'Passer d\'un commercial à l\'autre',
            body: 'Les flèches ‹ › ouvrent le commercial précédent ou suivant du cockpit, sans revenir en arrière.'
        }
    ]
};

/** Visite de l'écran Versements. */
export const DEPOSITS_TOUR: TourDefinition = {
    id: 'report-deposits',
    version: 1,
    steps: [
        {
            target: 'deposits-totals',
            title: 'Les totaux par compte',
            body: 'Total versé sur la période, réparti en crédit, tontine (rattrapages compris) et solde des nouveaux comptes. '
                + 'Le surplus non catégorisé est l\'argent versé en plus de ce qui était dû.'
        },
        {
            target: 'deposits-table',
            title: 'Un dépôt par ligne',
            body: 'Les lignes en surplus sont surlignées. « Équilibrer » affecte le surplus aux manquants du commercial. '
                + 'Les rattrapages répartis sur des jours passés sont détaillés sous le dépôt.'
        },
        {
            target: 'deposits-view',
            title: 'La remise au gérant',
            body: 'Le bouton « Remise secrétaire → gérant » ouvre la remise de la caisse, comme l\'ancien onglet « Remise ».'
        }
    ]
};

/** Visite du journal des opérations. */
export const JOURNAL_TOUR: TourDefinition = {
    id: 'report-journal',
    version: 1,
    steps: [
        {
            target: 'journal-types',
            title: 'Un total par type',
            body: 'Chaque carte donne le nombre et le montant d\'un type d\'opération. Cliquez dessus pour ne garder '
                + 'que ce type ; cliquez à nouveau pour tout revoir.'
        },
        {
            target: 'journal-export',
            title: 'Exporter',
            body: 'Le PDF reprend la période, le commercial et le type choisis.'
        }
    ]
};

/** Visite de la remise au gestionnaire (/report/daily/remittance). */
export const REMITTANCE_TOUR: TourDefinition = {
    id: 'report-remittance',
    version: 1,
    steps: [
        {
            target: 'remittance-period',
            title: 'Le mois et les dates',
            body: 'Une remise porte sur un mois. Les flèches ‹ › changent de mois ; Du et au limitent la remise à une partie du mois.\n'
                + 'Tant qu\'une remise attend la réception du gestionnaire, la période est figée.'
        },
        {
            target: 'remittance-kpis',
            title: 'Ce qui est à remettre',
            body: 'Reste à remettre = versements des commerciaux pas encore remis, répartis en crédit, tontine et solde des nouveaux comptes. '
                + 'Les dépenses cochées sont déduites : le montant net est ce qui passe au gestionnaire.'
        },
        {
            target: 'remittance-expenses',
            title: 'Les dépenses',
            body: 'Cochez les dépenses payées avec l\'argent de la caisse. Les approvisionnements ne sont pas proposés. '
                + 'Avant de recevoir, le gestionnaire peut encore retirer une dépense.'
        },
        {
            target: 'remittance-actions',
            title: 'Soumettre ou recevoir',
            body: 'Le secrétaire clique sur « Soumettre la remise ». Le gestionnaire clique sur « Accuser réception », '
                + 'ou sur « Initier la réception » pour recevoir directement sans soumission.'
        },
        {
            target: 'remittance-history',
            title: 'L\'historique',
            body: 'Chaque remise, avec son statut et qui l\'a soumise ou reçue. La flèche affiche les versements inclus.'
        },
        {
            target: 'classic',
            title: 'L\'ancien écran',
            body: '« Ancienne présentation » ouvre l\'onglet « Remise » que vous connaissez. Les deux écrans donnent les mêmes chiffres.'
        }
    ]
};
