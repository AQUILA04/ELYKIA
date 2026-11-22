import { TourDefinition } from '@shared/report-ui/guided-tour/guided-tour.service';

/** Visite de la vue équipe du stock commercial (première ouverture de /stock/my-stock). */
export const STOCK_TEAM_TOUR: TourDefinition = {
  id: 'stock-team',
  version: 2,
  steps: [
    {
      title: 'Le stock commercial change de présentation',
      body: 'Un seul écran montre maintenant le stock de toute l\'équipe pour un mois : ce qui a été pris, '
        + 'vendu, retourné, ce qui reste chez les commerciaux, et l\'argent à recouvrer.\n'
        + 'Cette visite dure une minute. Vous pouvez la relancer avec le bouton « Visite guidée ».'
    },
    {
      target: 'month',
      title: 'Choisir le mois',
      body: 'Les flèches passent au mois précédent ou suivant. Le mois en cours indique dans combien de jours il sera clôturé. '
        + 'Les anciens mois remplacent le bouton « Historique ».'
    },
    {
      target: 'filters',
      title: 'Crédit ou tontine, et filtres',
      body: 'Basculez entre le stock crédit et le stock tontine. Les filtres isolent les commerciaux avec un stock restant, '
        + 'avec une dette, ou avec un recouvrement inférieur à 50 %. L\'onglet Tontine montre le stock tontine de l\'année.'
    },
    {
      target: 'to-settle',
      title: 'Les mois à régulariser',
      body: 'Quand un mois clôturé garde un reste ni vendu ni retourné, il apparaît dans ce bandeau orange. '
        + 'Un clic ouvre la régularisation : retour en magasin, dette marchandise, puis règlement de la dette.'
    },
    {
      target: 'flows',
      title: 'Deux flux à lire',
      body: 'Marchandise : pris = vendu + retourné + en dette + restant.\n'
        + 'Argent : total dû (vendu + dette + restant) − recouvré = reste à recouvrer.'
    },
    {
      target: 'team',
      title: 'Une ligne par commercial',
      body: 'Les commerciaux avec le plus gros reste à recouvrer sont en haut. Cliquez sur une ligne pour ouvrir sa fiche : '
        + 'ses articles, leurs mouvements et les ventes liées.'
    },
    {
      target: 'classic',
      title: 'L\'ancienne présentation reste disponible',
      body: 'Si vous ne retrouvez pas une information, le lien « Ancienne présentation » ouvre l\'écran que vous connaissez.'
    }
  ]
};

/** Visite de la fiche stock d'un commercial. */
export const STOCK_SHEET_TOUR: TourDefinition = {
  id: 'stock-sheet',
  version: 1,
  steps: [
    {
      target: 'sheet-nav',
      title: 'La fiche d\'un commercial',
      body: 'Passez au commercial précédent ou suivant sans revenir à la liste, ouvrez les ventes liées ou téléchargez le rapport PDF.'
    },
    {
      target: 'sheet-flows',
      title: 'Marchandise et argent',
      body: 'Les mêmes flux que la vue équipe, pour ce commercial seulement. Le taux de recouvrement inclut la dette déjà réglée.'
    },
    {
      target: 'sheet-articles',
      title: 'Les articles à suivre',
      body: 'Par défaut, seuls les articles avec un reste ou une dette sont affichés. « Tous » montre aussi les articles entièrement vendus.\n'
        + '« Détail » ouvre les mouvements, les ventes et la valorisation de l\'article.'
    }
  ]
};
