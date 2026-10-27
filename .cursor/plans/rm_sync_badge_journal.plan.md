# Pastilles Sync / Local et rapport journalier du chef de recouvrement

## Pastilles

Les listes Retards, Terrain (crédits et tontine) et Clients réutilisent les pastilles `Sync` / `Local` de l'application commerciale.

Un dossier est **Local** tant qu'une opération qui le concerne n'est pas transmise : contrôle, vérification de carnet, clôture, contact ou transfert. Un échec de synchronisation laisse la pastille sur **Local**. Les autres dossiers affichent **Sync**.

## Rapport

Le journal est construit sur le téléphone à partir des opérations dont la date locale est celle du jour. Statuts : Synchronisé, Local, Échec.

Le PDF suit le rapport journalier commercial : HTML local, `PdfReportService.generatePDF`, puis `savePDFToExternalStorage` dans `elykia/rapport` avec `generateFilename`. L'enregistrement a lieu à la fin de chaque synchronisation, succès ou échec. Le bouton **Télécharger le rapport du jour** relance le même enregistrement.
