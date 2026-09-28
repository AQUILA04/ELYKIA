# Plan — Refonte login Espace Client (Type A)

## Objectif

Remplacer le layout centré « logo + carte crème » par le design system Type A (maquette S-02) : header navy + rubans, carte overlap, champs outlined, CTA navy.

## Changements

- `auth.page.html` / `.scss` / `.ts` : `app-elyk-decor-header` (ribbons), `app-elyk-overlap-card`, `app-elyk-outlined-field`, `elyk-btn-navy`
- Conserver le wizard multi-étapes et tous les `data-testid` e2e
- Titres émotionnels (« Bon retour ! ») + footer hint agence
- Guide utilisateur `customer/connexion.md` + index RAG
- Version Customer-space + CHANGELOG
