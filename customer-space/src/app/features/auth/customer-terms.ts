/** Textes de l'étape d'acceptation avant l'envoi du SMS d'inscription. */

export const REGISTER_CONSENT_LEAD =
  "Ce numéro n'est pas encore associé à un client d'AMENOUVEVE-YAVEH.";

export const REGISTER_CONSENT_BODY =
  "Si vous souhaitez vous enregistrer en tant que client, lisez les conditions d'utilisation, cochez la case pour les accepter, puis appuyez sur Continuer. Un code de vérification vous sera envoyé par SMS seulement après cette acceptation.";

export const REGISTER_CONSENT_BACK =
  "Si vous ne souhaitez pas créer de compte, appuyez sur Retour : vous restez sur la page d'accueil.";

export const CUSTOMER_TERMS_SECTIONS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Objet',
    body: "Ces conditions décrivent l'usage de l'Espace Client Elykia, proposé par AMENOUVEVE-YAVEH. En cochant la case, vous demandez l'ouverture d'un compte client et vous acceptez les engagements qui suivent. Vous ne pourrez pas invoquer le fait de ne pas les avoir lues pour vous en dégager.",
  },
  {
    title: 'Qui peut créer un compte',
    body: "L'inscription est réservée aux personnes majeures (18 ans ou plus). Vous utilisez un numéro de téléphone mobile togolais, vérifié par un code reçu par SMS, puis vous choisissez un code PIN personnel.",
  },
  {
    title: 'Bonne foi et responsabilité',
    body: "Vous déclarez agir de bonne foi. Vous vous engagez moralement et personnellement à honorer les obligations liées à votre compte. Les informations que vous donnez sont exactes, sincères et complètes. Toute déclaration fausse, incomplète ou trompeuse engage votre responsabilité.",
  },
  {
    title: "Ce que permet l'espace",
    body: 'Selon les services ouverts pour votre compte, vous pouvez suivre vos crédits et vos achats, passer des commandes et participer à la tontine. L\'ouverture du compte ne vaut pas, à elle seule, accord d\'un crédit.',
  },
  {
    title: 'Contrats de crédit',
    body: "Chaque achat à crédit est régi par le contrat établi pour cet achat. Vous vous engagez à en respecter les termes, notamment le montant, la durée, l'échéancier et toute condition qui vous est remise au moment de l'achat. Ces contrats demeurent applicables même si les présentes conditions sont mises à jour plus tard.",
  },
  {
    title: 'Paiement des échéances',
    body: "Vous vous engagez à payer régulièrement chaque échéance, à la date prévue par le contrat de vos achats, jusqu'au paiement complet des sommes dues. Un retard, un paiement partiel ou un défaut de paiement ne vous libère pas du solde restant.",
  },
  {
    title: 'Préjudice financier',
    body: "Vous vous engagez à ne pas causer de dommage financier à AMENOUVEVE-YAVEH. Il vous est interdit d'obtenir un bien ou un crédit au moyen d'informations fausses, de céder ou de détourner un bien dont le crédit n'est pas soldé lorsque le contrat l'interdit, et d'organiser ou de faciliter volontairement un défaut de paiement.",
  },
  {
    title: 'En cas de manquement',
    body: "Si vous ne respectez pas ces engagements, AMENOUVEVE-YAVEH peut refuser de nouveaux achats, suspendre l'accès à votre espace, exiger le paiement des sommes dues et exercer les recours utiles pour en obtenir le recouvrement et la réparation du préjudice subi.",
  },
  {
    title: 'Informations demandées',
    body: 'La création du compte demande votre identité, votre adresse, votre zone, votre occupation et une photo de profil où votre visage est visible. Ces éléments constituent votre dossier client.',
  },
  {
    title: "Position au moment de l'inscription",
    body: "Pour finaliser l'inscription, l'application enregistre la position de votre téléphone ou de votre navigateur. Elle sert à situer la création du compte. Si vous refusez cet accès, le compte ne peut pas être créé.",
  },
  {
    title: 'Code PIN',
    body: 'Votre code PIN est confidentiel. Ne le communiquez à personne. Il protège l\'accès à votre espace.',
  },
  {
    title: "Validation par l'agence",
    body: "L'envoi du formulaire ne rend pas le compte immédiatement actif. AMENOUVEVE-YAVEH examine le dossier. Vous êtes informé lorsque le compte est validé.",
  },
  {
    title: 'Utilisation des informations',
    body: 'Les informations servent à vous identifier, à gérer vos achats, vos crédits et votre tontine, à vous adresser les messages liés à votre compte et à sécuriser la connexion.',
  },
  {
    title: 'Correction ou fermeture',
    body: 'Pour corriger une information ou fermer votre compte, adressez-vous à votre agence AMENOUVEVE-YAVEH.',
  },
  {
    title: 'Évolution',
    body: "AMENOUVEVE-YAVEH peut mettre à jour ces conditions. La version que vous acceptez au moment de l'inscription est celle qui s'applique à la création de votre compte.",
  },
];
