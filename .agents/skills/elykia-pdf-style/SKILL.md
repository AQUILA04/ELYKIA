---
name: elykia-pdf-style
description: >
  Impose le thème PDF navy Elykia (AMENOUVEVE-YAVEH, TOKOIN HÔPITAL, pagination n/N)
  pour tout nouvel export PDF backend. À appliquer dès qu'un PDF, fiche, export
  html2pdf ou template Thymeleaf d'impression est créé ou modifié.
---

# Thème PDF Elykia (navy)

## Quand appliquer

- Nouveau PDF backend (fiche, export, rapport imprimable)
- Modification d'un template sous `backend/src/main/resources/templates/` destiné à iText html2pdf
- **Ne pas** migrer les anciens templates sauf demande explicite

## Stack obligatoire

1. Thymeleaf HTML → `PdfHtmlRenderer.htmlToPdf(html, footerLabel)`
2. Identité entreprise via `PdfDocumentIdentity.applyTo(context, documentTitle)`
3. Fragments [`backend/src/main/resources/templates/pdf/fragments.html`](backend/src/main/resources/templates/pdf/fragments.html)

Ne pas appeler `HtmlConverter.convertToPdf` directement. Ne pas recréer un CSS ad hoc.

## Identité (ne pas modifier)

| Champ | Valeur |
|-------|--------|
| Nom | `AMENOUVEVE-YAVEH` |
| Adresse | `TOKOIN HÔPITAL` |
| Téléphone | `96186822` (affichage `96 18 68 22`) |
| Couleur primaire | `#003366` |

## Recette d'un nouveau PDF

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

Référence : [`client-list-export.html`](backend/src/main/resources/templates/client-list-export.html)

## Contraintes iText html2pdf

- Pas de flexbox ni CSS grid : tables pour en-tête, KPI et données
- CSS inline via le fragment `styles` (pas de fichier CSS externe)
- `@page` margin bas ≥ 24mm pour laisser la place au tampon navy `n/N`
- `page-break-inside: avoid` sur les blocs courts

## Pied de page

`PdfHtmlRenderer` tamponne chaque page : bande navy, libellé à gauche, **`1/30`** à droite. Ne pas dessiner un footer HTML en bas de document à la place.

## Checklist

- [ ] `PdfDocumentIdentity.applyTo` + `footerLabel`
- [ ] Fragments `styles` + `header`
- [ ] Classes `.pdf-meta` / `.pdf-kpi` / `.data-table` (pas de couleurs hors palette navy)
- [ ] `PdfHtmlRenderer.htmlToPdf` (pagination n/N)
- [ ] Test : HTML multi-pages → texte `1/N` et `N/N` extraits du PDF
