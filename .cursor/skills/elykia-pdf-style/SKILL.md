---
name: elykia-pdf-style
description: >
  Impose le thème PDF / documents imprimables Elykia (AMENOUVEVE-YAVEH, navy #0a2472,
  mode clair, pagination n/N côté backend) pour tout nouvel export PDF, fiche, reçu,
  facture, bon ou template d'impression. À appliquer dès qu'un PDF, html2pdf,
  Thymeleaf d'impression ou aperçu imprimable est créé ou modifié. Visuel canonique :
  elykia-document-design + assets/recu-commande.html.
---

# Thème PDF / documents Elykia

Deux chemins de génération, **un seul design** (mode clair, navy accent `#0a2472`).

| Chemin | Quand | Stack |
|--------|-------|--------|
| **HTML / Angular** | Aperçu navigateur, `html2pdf` / `jspdf` côté frontend | Skill **`elykia-document-design`** + maquette [`assets/recu-commande.html`](assets/recu-commande.html) |
| **Backend iText** | Export API Thymeleaf → PDF | Ce skill + `PdfHtmlRenderer` + fragments |

Lire **`elykia-document-design`** en premier pour la présentation (bande fine, cartes, totaux, typo). Ce skill ajoute le pipeline backend et les contraintes iText.

## Quand appliquer

- Nouveau PDF backend (fiche, export, rapport, reçu, bon)
- Modification d'un template sous `backend/src/main/resources/templates/` destiné à iText html2pdf
- Nouveau document imprimable Angular / HTML (déléguer le CSS au design system)
- **Ne pas** migrer les anciens templates sauf demande explicite

## Design canonique (résumé)

Source complète : [`.cursor/skills/elykia-document-design/`](../elykia-document-design/SKILL.md) et [`DESIGN.md`](../elykia-document-design/DESIGN.md).

1. **Mode clair** uniquement (fond blanc).
2. **Navy = accent**, pas un gros bandeau d'en-tête plein.
3. Bande de marque **10 px** en haut (dégradé navy → mid → accent), logo carré + titre à droite.
4. Cartes d'infos, tableau aéré (en-tête `--navy-pale`), totaux avec bandeau navy « TOTAL À PAYER », reste en ambre.
5. Police **Plus Jakarta Sans** (HTML) ; montants à droite, `FCFA`, français.
6. Palette :

```text
navy #0a2472 | mid #1a3a8f | light #e8edf8 | pale #f2f5fc
accent #1565c0 | soft #4f83e0
green #2e7d32 | amber #f59e0b | red #e53935
text #0d1b3e | muted #94a3b8 | border #e2e8f0
```

Dans Angular : variables `--ad-*` de `frontend/src/styles.scss`.  
**Ne plus** introduire `#003366` sur les nouveaux documents (couleur historique des fragments non migrés).

Référence visuelle (copie locale) : [`assets/recu-commande.html`](assets/recu-commande.html).  
Captures : [`assets/screenshots/recu-commande-top.png`](assets/screenshots/recu-commande-top.png), [`assets/screenshots/recu-commande-bottom.png`](assets/screenshots/recu-commande-bottom.png).

---

## Chemin A — HTML / Angular (présentation complète)

1. Ouvrir `elykia-document-design/assets/recu-commande.html` (ou la copie ci-dessus).
2. Reproduire structure + tokens + impression A4 du skill document-design.
3. Export : `html2pdf.js` / `jspdf` + `html2canvas` sur `#receipt`, `print-color-adjust: exact`.
4. Si reçu / facture : règle `receipt-authenticity` (`ELY-XXXX-XXXX`).

Flexbox, CSS grid, Material Icons et ombres sont **autorisés** sur ce chemin.

---

## Chemin B — Backend Thymeleaf + iText

### Stack obligatoire

1. Thymeleaf HTML → `PdfHtmlRenderer.htmlToPdf(html, footerLabel)`
2. Identité entreprise via `PdfDocumentIdentity.applyTo(context, documentTitle)`
3. Fragments [`backend/src/main/resources/templates/pdf/fragments.html`](../../../backend/src/main/resources/templates/pdf/fragments.html)

Ne pas appeler `HtmlConverter.convertToPdf` directement. Ne pas inventer une palette hors design system.

### Identité (ne pas modifier sans décision produit)

| Champ | Valeur |
|-------|--------|
| Nom | `AMENOUVEVE-YAVEH` |
| Adresse | `TOKOIN HÔPITAL` |
| Téléphone | `96186822` (affichage `96 18 68 22`) |
| Couleur primaire cible | `#0a2472` |

`PdfDocumentIdentity.PRIMARY_COLOR_HEX` et les fragments historiques peuvent encore exposer `#003366` tant qu'ils ne sont pas migrés : **pour tout nouveau CSS de template**, utiliser `#0a2472` / `#e8edf8` / `#f2f5fc` / `#e2e8f0` (alignés design system). Une migration des fragments partagés se fait uniquement sur demande explicite.

### Recette d'un nouveau PDF backend

```java
Context context = new Context();
PdfDocumentIdentity.applyTo(context, "Titre du document");
context.setVariable("doc", dto);
String html = templateEngine.process("mon-export", context);
return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel("Titre du document"));
```

Dans le template :

```html
<head>
    <th:block th:replace="~{pdf/fragments :: styles}"></th:block>
</head>
<body>
    <div th:replace="~{pdf/fragments :: header}"></div>
    <!-- meta, KPI, tableau : classes .pdf-meta .pdf-kpi .data-table -->
</body>
```

Référence listes / exports : [`client-list-export.html`](../../../backend/src/main/resources/templates/client-list-export.html).  
Référence reçu + authenticité : [`tontine-order-receipt.html`](../../../backend/src/main/resources/templates/tontine-order-receipt.html).

### Adaptation iText du design moderne (obligatoire sur le contenu nouveau)

iText html2pdf **ne gère pas** flexbox ni CSS grid. Traduire le design ainsi :

| Intention design (HTML) | Adaptation iText |
|-------------------------|------------------|
| Grille 3 cartes | `table` 3 colonnes, cellules type `.pdf-meta` / bordure `#e2e8f0`, fond blanc ou `#f2f5fc` |
| Bande 10 px navy | barre haute via table 100 % hauteur ~10 px fond `#0a2472`, ou border-top épaisse — **pas** un gros `.pdf-brand` plein écran sur un *nouveau* layout custom |
| En-tête tableau pale | `th` fond `#f2f5fc`, texte `#0a2472`, pas de zèbre obligatoire |
| Totaux / reste | table : ligne navy plein `#0a2472` texte blanc pour le total ; ligne ambre `#fff8e1` / `#92600a` pour le reste |
| Signatures | table 2 colonnes, trait `border-bottom` |
| Ombres / radius / Material Icons | simplifier (iText limité) ; garder contrastes et hiérarchie |

CSS inline via le fragment `styles` (pas de fichier CSS externe ni Google Fonts CDN dans le PDF iText — Helvetica / Arial en repli acceptable côté moteur).

### Contraintes iText html2pdf

- Pas de flexbox ni CSS grid : tables pour en-tête, KPI et données
- `@page` margin bas ≥ 24 mm pour laisser la place au tampon navy `n/N`
- `page-break-inside: avoid` sur les blocs courts (cartes, totaux, authenticité)

### Pied de page

`PdfHtmlRenderer` tamponne chaque page : bande navy, libellé à gauche, **`1/30`** à droite. Ne pas dessiner un footer HTML en bas de document à la place (le tampon iText le remplace).

---

## Reçu ou facture

Si le PDF est un **reçu** ou une **facture** remis à une personne, appliquer aussi la règle `receipt-authenticity` : code `ELY-XXXX-XXXX` persisté, imprimé, et vérifiable. Le thème navy ne remplace pas cette authenticité. Le code est **discret** (coin du pied de page, muted) — jamais brandi en bandeau. Référence : `tontine-order-receipt.html` et `elykia-document-design/assets/recu-commande.html`.

## Checklist

### Commun

- [ ] Aligné sur `elykia-document-design` / `recu-commande.html` (hiérarchie, navy accent, montants)
- [ ] Palette `#0a2472` (pas de nouveau `#003366`)
- [ ] Français, montants formatés, devise
- [ ] Si reçu / facture : code d'authenticité + vérification

### Backend iText

- [ ] `PdfDocumentIdentity.applyTo` + `footerLabel`
- [ ] Fragments `styles` + `header` (ou layout custom tables compatible iText)
- [ ] Pas de flex/grid ; `page-break-inside: avoid` sur blocs courts
- [ ] `PdfHtmlRenderer.htmlToPdf` (pagination `n/N`)
- [ ] Test : HTML multi-pages → texte `1/N` et `N/N` extraits du PDF

### Angular / HTML

- [ ] Tokens CSS + bande 10 px + structure A4
- [ ] `print-color-adjust: exact` ; toolbar masquée à l'impression
- [ ] Export ciblé sur `#receipt` (ou équivalent)
