# Surplus visible et équilibrage des manquants

Plan source: `/opt/cursor/artifacts/plans/surplus_rapport_caisse_006818d5.plan.md`

## Livré

1. Surplus agrégé dans les rapports période + hint UI « dont surplus non catégorisé »
2. `POST /api/cash-deposits/reallocate-surplus` + bouton **Équilibrer le surplus**
3. Sync rapport jour, remise, bilan mensuel via `reportPersistence`
4. Tables `cash_surplus_reallocation` / `_line`, journal `SURPLUS_REALLOCATION`, mentions sur la fiche
5. Guide + RAG + HTML + changelog FE 2.31.0 / BE 1.34.0
