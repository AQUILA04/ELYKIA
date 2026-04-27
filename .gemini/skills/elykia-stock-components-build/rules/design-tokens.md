# Design Tokens - Module de Gestion des Stocks ELYKIA

Ce document définit les fondations visuelles du module mobile de gestion des stocks, basées sur la charte "Enterprise SaaS Mobile" inspirée de la Fintech.

## Palette de Couleurs

La palette allie la confiance (bleus/indigos) à la clarté fonctionnelle (statuts).

| Rôle | Variable CSS | Valeur Hex | Utilisation |
|------|--------------|------------|-------------|
| **Primaire** | `--color-primary` | `#1E40AF` | Boutons principaux, onglets actifs, icônes clés |
| **Secondaire** | `--color-secondary` | `#64748B` | Éléments d'accentuation, dégradés subtils |
| **Fond App** | `--color-background` | `#F8FAFC` | Fond principal de l'application |
| **Surfaces** | `--color-surface` | `#FFFFFF` | Cartes, modales, bottom sheets |
| **Texte Principal** | `--color-text-primary` | `#0F172A` | Titres, texte principal, valeurs |
| **Texte Secondaire** | `--color-text-muted` | `#64748B` | Labels, sous-titres, placeholders |
| **Bordures** | `--color-border` | `#E2E8F0` | Séparateurs, bordures de cartes |

### Couleurs Sémantiques (Statuts)

| Statut | Fond (Light) | Texte (Dark) | Utilisation |
|--------|--------------|--------------|-------------|
| **En Attente / Créé** | `#FEF3C7` | `#D97706` | Statut `CREATED` |
| **Validé** | `#DBEAFE` | `#2563EB` | Statut `VALIDATED` |
| **Livré** | `#D1FAE5` | `#059669` | Statut `DELIVERED` |
| **Refusé / Annulé** | `#FEE2E2` | `#DC2626` | Statuts `REFUSED`, `CANCELLED` |

## Typographie

La police principale est **Plus Jakarta Sans** (ou **Inter** en fallback). Elle garantit une lisibilité maximale en extérieur.

*   **H1 (En-têtes) :** 24px, ExtraBold (800)
*   **H2 (Titres de section) :** 18px, Bold (700)
*   **Corps de texte :** 16px, Regular (400) - *Taille minimale pour éviter le zoom iOS*
*   **Labels et Badges :** 12px, SemiBold (600), Majuscules

## Formes et Élévation

Inspiré du Material Design adapté pour un rendu moderne.

*   **Rayon des Cartes / Modales :** `--radius-card` = `16px`
*   **Rayon des Boutons / Inputs :** `--radius-input` = `8px`
*   **Rayon des Badges / Boutons Pill :** `999px`
*   **Ombres des Cartes :** `0 4px 6px -1px rgba(79, 70, 229, 0.08)` (Ombres douces et colorées, pas de gris dur)
