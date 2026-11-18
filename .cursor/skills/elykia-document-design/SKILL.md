---
name: elykia-document-design
description: >
  Design system des documents Elykia (reçu de commande, facture, bon de sortie,
  reçu de collecte, rapport, PDF imprimable) en HTML/CSS ou Angular, style moderne
  navy en mode clair. Utiliser systématiquement dès que la demande concerne un reçu,
  une facture, un bon, un rapport, un document PDF, une maquette de document ou une
  impression, même si le design n'est pas mentionné, pour garder un rendu cohérent
  avec assets/recu-commande.html. Pour les PDF backend iText, combiner avec
  elykia-pdf-style.
---

# Design System — Documents Elykia (reçus, factures, bons, rapports)

Objectif : tout document imprimable ou exportable en PDF (reçu de commande, facture, bon de sortie, reçu de collecte, rapport) doit avoir le même rendu **moderne, sobre et professionnel**, en mode clair, avec le navy comme couleur de marque.

**Référence visuelle obligatoire** : ouvrir [`assets/recu-commande.html`](assets/recu-commande.html) et s'en inspirer avant de produire un nouveau document. Spec détaillée : [`DESIGN.md`](DESIGN.md). Captures : [`assets/screenshots/recu-commande-top.png`](assets/screenshots/recu-commande-top.png), [`assets/screenshots/recu-commande-bottom.png`](assets/screenshots/recu-commande-bottom.png).

## 1. Principes

1. **Mode clair uniquement** : fond blanc, jamais de fond sombre pleine page.
2. **Le navy est un accent, pas un aplat** : il apparaît en fine bande en haut, dans les titres, les en-têtes de tableau, les pastilles et le bandeau « total ». Jamais en gros bloc d'en-tête.
3. **Aéré et lisible** : marges 40 px (≈ 10 mm), grands espaces verticaux, lignes de tableau à 13 px de padding.
4. **Hiérarchie claire** : titre du document > cartes d'infos > tableau > totaux > signatures > pied de page.
5. **Utile au métier** : le chiffre important (total, reste à payer) est le plus visible de la page.
6. **Un document = une page A4** quand c'est possible ; sinon répéter l'en-tête de tableau (`thead { display: table-header-group }`).

## 2. Tokens (variables CSS à toujours déclarer)

```css
:root{
  --navy:#0a2472; --navy-mid:#1a3a8f; --navy-light:#e8edf8; --navy-pale:#f2f5fc;
  --accent:#1565c0; --accent-soft:#4f83e0;
  --green:#2e7d32; --green-bg:#e8f5e9;
  --amber:#f59e0b; --amber-bg:#fff8e1;
  --red:#e53935;   --red-bg:#ffebee;
  --text:#0d1b3e; --text2:#4a5568; --muted:#94a3b8;
  --border:#e2e8f0; --border-dark:#cbd5e1;
  --radius:12px; --radius-sm:8px;
  --shadow:0 2px 8px rgba(10,36,114,.10),0 8px 24px rgba(10,36,114,.08);
}
```

Ces valeurs correspondent aux variables `--ad-*` de `frontend/src/styles.scss` (`--ad-navy`, `--ad-navy-light`, etc.). Dans l'app Angular, utiliser les variables `--ad-*` ; dans un document autonome (maquette HTML, template hors app), utiliser les noms ci-dessus.

**Ancien navy `#003366`** : ne plus l'introduire sur les nouveaux documents. Les exports backend historiques peuvent encore l'utiliser jusqu'à migration explicite des fragments.

## 3. Typographie

- Police : **Plus Jakarta Sans** (Google Fonts, graisses 400–800), repli `Roboto, "Helvetica Neue", sans-serif`.
- Titre de document : 24–26 px, 800, navy. Titre de section : 13 px, 800, MAJUSCULES, `letter-spacing: 1.2px`, navy.
- Libellés de cartes / colonnes : 10.5 px, 700, MAJUSCULES, `letter-spacing: .8–1px`, couleur `--muted` (cartes) ou `--navy` (colonnes).
- Texte courant : 12–12.5 px ; valeurs fortes : 14 px, 700.
- Icônes : **Material Icons** (CDN), 14–18 px, couleur `--navy-mid`.
- Nombres : alignés à droite, séparateur de milliers (espace), devise en fin (`81 890 FCFA`).

## 4. Structure d'une page (A4, 210 × 297 mm)

1. **Bande de marque** : barre de 10 px en haut, dégradé `navy → navy-mid → accent`, avec un petit segment `--accent-soft` (90 × 10 px, coins bas arrondis de 4 px) **à l'intérieur** de la barre (`top:0`). Rien ne doit dépasser de la barre.
2. **En-tête blanc** : logo carré navy 44 px (arrondi 12 px, lettre blanche) + nom de la marque (16 px, 800, navy, `letter-spacing: 1.2px`) + sous-titre muted ; à droite : étiquette « DOCUMENT », titre du document, pastille du numéro (`--navy-light` / texte navy).
3. **Cartes d'infos** : grille de 3 colonnes (client, commercial, dates), fond blanc, bordure `--border`, rayon 12 px, ombre `--shadow`. Placées juste sous l'en-tête, **sans chevauchement**.
4. **Section principale** : titre de section à gauche, badge de statut à droite, puis le tableau.
5. **Bas de page en 2 colonnes** : à gauche le bloc paiement (bordure en tirets, QR), à droite le bloc totaux (280 px).
6. **Signatures** : deux zones avec trait fin et libellé en majuscules muted.
7. **Pied de page** : fond `--navy-pale`, message de remerciement en navy 700, contacts avec icônes.

## 5. Composants

- **Tableau** : `border-collapse: separate`, en-tête `--navy-pale` avec coins arrondis (8 px) aux extrémités, texte navy 10.5 px MAJUSCULES ; lignes séparées par `1px solid --border`, pas de bordures verticales, pas de zèbre. Colonne `#` centrée en muted ; désignation à gauche avec sous-ligne (référence · catégorie) en 11 px muted ; quantité dans une pastille `--navy-light`/navy ; dernière colonne (total) en 700.
- **Badges de statut** : pill (rayon 20 px), 11.5 px, 700, icône Material 14 px. Vert (payé, validé, réglé), ambre (en attente, acompte), rouge (annulé, en retard), navy-light (créé, en cours).
- **Bloc totaux** : fond `--navy-pale`, rayon 12 px. Lignes sous-total/remise (remise en vert), puis **bandeau navy plein** « TOTAL À PAYER » (libellé 11 px MAJUSCULES, montant 20 px 800 blanc) qui déborde de 18 px de chaque côté du bloc, puis acompte, puis **reste à payer** dans un encart `--amber-bg` (texte `#92600a`).
- **Bloc paiement** : bordure `1px dashed --border-dark`, rayon 12 px, QR 84 px à gauche, informations à droite (mode, reçu par, référence).
- **Boutons à l'écran** (hors impression) : fond navy, texte blanc, rayon 8 px, icône, ombre bleutée ; survol `--navy-mid` + `translateY(-1px)`.

## 6. Impression / PDF (obligatoire)

```css
@page{ size:A4; margin:0 }
body{ -webkit-print-color-adjust:exact; print-color-adjust:exact }
@media print{ body{background:#fff;padding:0} .toolbar{display:none} .receipt{box-shadow:none;margin:0} }
tr,.card,.totals{ break-inside:avoid }
```

- Feuille : `width:210mm; min-height:297mm`.
- Export PDF côté Angular : `html2pdf.js` ou `jspdf` + `html2canvas` appliqués à l'élément `#receipt` ; garder les couleurs (`print-color-adjust: exact`).
- Export PDF côté backend (Thymeleaf + iText) : suivre aussi le skill **`elykia-pdf-style`** (pas de flex/grid, `PdfHtmlRenderer`, fragments).

## 7. À faire / à ne pas faire

**À faire** : navy en accent ; cartes avec ombre douce ; badges colorés sémantiques ; montants alignés à droite ; texte en français ; données dynamiques (`{{ }}`) dans Angular ; icônes Material.

**À ne pas faire** : gros bloc navy en en-tête ; fond sombre ; plus de 2 familles de police ; bordures épaisses ; couleurs hors palette ; dégradés violets/roses ; texte justifié ; animation dans un document destiné au PDF ; débordement hors de la feuille (tout reste dans les 210 mm).

## 8. Reçu ou facture

Si le document est un **reçu** ou une **facture** remis à une personne, appliquer aussi la règle `receipt-authenticity` : code `ELY-XXXX-XXXX` persisté, imprimé, et vérifiable. Le design ne remplace pas cette authenticité.

**Placement du code d'authenticité (obligatoire)** : information **discrète**, jamais brandie.
- Coin bas (souvent bas-droite du pied de page), texte muted 8–10 px, sans bandeau navy, sans pastille pleine largeur, sans titre « CODE D'AUTHENTICITÉ » en majuscules proéminent.
- Le code reste lisible pour qui doit vérifier une facture ; une courte mention du type « vérif. reçu Elykia » suffit à indiquer l'usage.
- Référence visuelle : pied de page de `assets/recu-commande.html`.

## 9. Checklist avant de rendre un document

- [ ] Bande navy fine en haut, rien qui dépasse
- [ ] Variables CSS de la palette utilisées (pas de couleurs en dur hors palette)
- [ ] Plus Jakarta Sans + Material Icons chargés (ou équivalent `--ad-*` dans l'app)
- [ ] Le montant clé (total / reste à payer) est le plus visible
- [ ] Rendu correct à l'impression A4 (pas de coupure au milieu d'une ligne ou d'une carte)
- [ ] Textes en français, montants formatés, devise présente
- [ ] Si reçu / facture : code d'authenticité `ELY-XXXX-XXXX` **discret** (coin, pas brandi)
- [ ] Comparaison visuelle avec `assets/recu-commande.html`
