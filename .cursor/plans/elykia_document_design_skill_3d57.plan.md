---
name: Elykia document design skill
overview: >
  Intégrer le design system documents (DESIGN.md + recu-commande.html) et
  mettre à jour le skill PDF pour une présentation moderne navy en mode clair.
todos:
  - id: install-document-design
    content: Skill elykia-document-design + assets/recu-commande.html + DESIGN.md
    status: completed
  - id: update-pdf-style
    content: Réécrire elykia-pdf-style (palette #0a2472, dual path HTML/iText, lien design)
    status: completed
  - id: memory-changelog
    content: memory-bank + CHANGELOG Docs & Infra
    status: completed
  - id: screenshots
    content: Captures de référence haut/bas du reçu dans assets/screenshots
    status: completed
isProject: false
---

# Design system documents + skill PDF

## Contexte

Maquettes fournies : `DESIGN.md`, package `elykia-document-design.skill`, `recu-commande.html`.
L’ancien skill `elykia-pdf-style` imposait un bandeau navy plein `#003366` orienté iText.
Le frontend utilise déjà `--ad-navy: #0a2472` dans `styles.scss`.

## Livrables

1. `.cursor/skills/elykia-document-design/` — design system HTML/Angular + référence visuelle
2. `.cursor/skills/elykia-pdf-style/` — mis à jour (chemins Angular et backend, contraintes iText)
3. Pas de migration forcée des fragments Thymeleaf historiques (sauf demande ultérieure)

## Hors périmètre

- Refonte des templates `pdf/fragments.html` / `PdfDocumentIdentity` en production
- Changement de reçus métier existants
