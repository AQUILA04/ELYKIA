---
name: RM chef taux recouvrement
overview: "Taux de recouvrement mensuel du chef RM sur tous les retards délai app — F2+P0+A2+U2+D-b — VALIDATED + implémenté."
todos:
  - id: validate-denominator
    content: "Valider le dénominateur mensuel (snapshot début de mois vs stock live de tous les retards app) et le numérateur (cash amountCollected vs timeline)"
    status: completed
  - id: validate-ux
    content: "Valider le placement UX (bandeau mensuel Retards vs 4ᵉ pastille vs Plus), sélecteur de mois, comportement offline"
    status: completed
  - id: backend-kpi-endpoint
    content: "Après validation — endpoint mensuel (ops chef / portefeuille retards global) + tests"
    status: completed
  - id: mobile-rm-display
    content: "Après validation — afficher le taux sur /rm/dashboard (online) + états offline/chargement"
    status: completed
  - id: changelog-guides
    content: "Après validation — CHANGELOG + guide recovery-manager/mobile.md"
    status: completed
isProject: false
---

# Taux de recouvrement mensuel — Chef de recouvrement (mobile RM)

**Statut :** **VALIDATED** + implémenté (F2 + P0 + A2 + U2 + D-b ; retards délai uniquement).

**Décisions figées :**
1. Terminologie = **taux de recouvrement**.
2. Numérateur = Σ `amountCollected` (ops du chef, mois).
3. Dénominateur = dû live de **tous** les retards **délai** de l’app (`CreditLateService` / `totalAmountRemainingDelai`).
4. Endpoint dédié `GET /api/v1/recovery-manager/kpi/monthly-recovery-rate?year=&month=`.
5. UX mobile = bandeau « Taux du mois » sur `/rm/dashboard`, séparé du strip plan.
6. Même KPI côté web (rapport Recouvrement terrain).
7. Offline = cache / message en ligne uniquement.
8. Multi-chefs = % individuels sur stock late partagé OK.

Voir copie store : `/cursor/stores/bc-fbdc0dac-2b34-4a43-a4bd-57c4441d9067/docs/rm-chef-taux-recouvrement-plan.md`.
