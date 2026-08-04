-- Rapport passation de commerciaux (crédits)
-- Source : credit_collector_history (snapshot à changeCollector / bulkChangeCollector)
--
-- Montants historisés à la passation :
--   total_amount           = total de la vente
--   total_amount_paid      = déjà recouvré par le commercial sortant
--   total_amount_remaining = restant à recouvrer par le commercial entrant
--
-- Règle métier : 1 crédit = 1 fois (dernière passation dans le filtre),
-- même s'il a subi plusieurs transferts.
--
-- Adapter les usernames / dates avant exécution.
-- Exemple prod : COM014 → COM013

-- \set old_collector 'COM014'
-- \set new_collector 'COM013'
-- \set from_date '2026-01-01'
-- \set to_date   '2026-12-31'

-- =============================================================================
-- 0. CTE réutilisable : dernière passation par crédit (dans le filtre)
-- =============================================================================
-- Remplacer les prédicats old/new/dates selon le besoin.

-- =============================================================================
-- 1. Synthèse d'une passation (ex. COM014 → COM013) — sans double comptage
-- =============================================================================
WITH filtered AS (
    SELECT h.*
    FROM credit_collector_history h
    WHERE h.visibility = 'ENABLED'
      AND UPPER(h.old_collector) = UPPER('COM014')   -- :old_collector
      AND UPPER(h.new_collector) = UPPER('COM013')   -- :new_collector
      -- AND h.change_date >= TIMESTAMP '2026-01-01' -- :from_date (optionnel)
      -- AND h.change_date <  TIMESTAMP '2027-01-01' -- :to_date   (optionnel, borne exclusive)
),
latest_per_credit AS (
    SELECT DISTINCT ON (f.credit_id) f.*
    FROM filtered f
    ORDER BY f.credit_id, f.change_date DESC, f.id DESC
)
SELECT
    COUNT(*)                                   AS nb_credits,
    COALESCE(SUM(l.total_amount), 0)           AS total_ventes,
    COALESCE(SUM(l.total_amount_paid), 0)      AS total_recouvre_sortant,
    COALESCE(SUM(l.total_amount_remaining), 0) AS total_restant_entrant,
    MIN(l.change_date)                         AS premiere_passation,
    MAX(l.change_date)                         AS derniere_passation
FROM latest_per_credit l;

-- =============================================================================
-- 2. Détail des ventes (1 ligne / crédit = dernière passation filtrée)
-- =============================================================================
WITH filtered AS (
    SELECT h.*
    FROM credit_collector_history h
    WHERE h.visibility = 'ENABLED'
      AND UPPER(h.old_collector) = UPPER('COM014')
      AND UPPER(h.new_collector) = UPPER('COM013')
),
latest_per_credit AS (
    SELECT DISTINCT ON (f.credit_id) f.*
    FROM filtered f
    ORDER BY f.credit_id, f.change_date DESC, f.id DESC
)
SELECT
    l.change_date,
    c.id                                           AS credit_id,
    c.reference,
    c.status,
    TRIM(CONCAT(COALESCE(cl.lastname, ''), ' ', COALESCE(cl.firstname, ''))) AS client,
    cl.phone                                       AS client_phone,
    l.old_collector,
    l.new_collector,
    l.total_amount                                 AS total_vente,
    l.total_amount_paid                            AS recouvre_par_sortant,
    l.total_amount_remaining                       AS restant_a_l_entrant,
    c.total_amount_paid                            AS paye_actuel,
    c.total_amount_remaining                       AS restant_actuel,
    l.reg_user_id                                  AS opere_par
FROM latest_per_credit l
JOIN credit c ON c.id = l.credit_id
LEFT JOIN client cl ON cl.id = c.client_id
ORDER BY l.change_date, c.reference;

-- =============================================================================
-- 3. Vue globale par couple — 1 crédit affecté à sa dernière passation uniquement
-- =============================================================================
WITH filtered AS (
    SELECT h.*
    FROM credit_collector_history h
    WHERE h.visibility = 'ENABLED'
      -- AND h.change_date >= TIMESTAMP '2026-01-01'
      -- AND h.change_date <  TIMESTAMP '2027-01-01'
),
latest_per_credit AS (
    SELECT DISTINCT ON (f.credit_id) f.*
    FROM filtered f
    ORDER BY f.credit_id, f.change_date DESC, f.id DESC
)
SELECT
    l.old_collector,
    l.new_collector,
    COUNT(*)                                   AS nb_credits,
    COALESCE(SUM(l.total_amount), 0)           AS total_ventes,
    COALESCE(SUM(l.total_amount_paid), 0)      AS total_deja_recouvre,
    COALESCE(SUM(l.total_amount_remaining), 0) AS total_restant_passation,
    MIN(l.change_date)                         AS premiere_passation,
    MAX(l.change_date)                         AS derniere_passation
FROM latest_per_credit l
GROUP BY l.old_collector, l.new_collector
ORDER BY derniere_passation DESC;

-- =============================================================================
-- 4. Totaux sortants par commercial (crédits cédés — dernière passation du crédit)
-- =============================================================================
WITH latest_per_credit AS (
    SELECT DISTINCT ON (h.credit_id) h.*
    FROM credit_collector_history h
    WHERE h.visibility = 'ENABLED'
    ORDER BY h.credit_id, h.change_date DESC, h.id DESC
)
SELECT
    l.old_collector                                AS commercial_sortant,
    COUNT(*)                                       AS nb_credits_cedes,
    COALESCE(SUM(l.total_amount), 0)               AS total_ventes_cedees,
    COALESCE(SUM(l.total_amount_paid), 0)          AS total_recouvre_avant_cession,
    COALESCE(SUM(l.total_amount_remaining), 0)     AS total_laisse_aux_entrants
FROM latest_per_credit l
GROUP BY l.old_collector
ORDER BY total_ventes_cedees DESC;

-- =============================================================================
-- 5. Totaux entrants par commercial (crédits reçus — dernière passation du crédit)
-- =============================================================================
WITH latest_per_credit AS (
    SELECT DISTINCT ON (h.credit_id) h.*
    FROM credit_collector_history h
    WHERE h.visibility = 'ENABLED'
    ORDER BY h.credit_id, h.change_date DESC, h.id DESC
)
SELECT
    l.new_collector                                AS commercial_entrant,
    COUNT(*)                                       AS nb_credits_recus,
    COALESCE(SUM(l.total_amount), 0)               AS total_ventes_recues,
    COALESCE(SUM(l.total_amount_paid), 0)          AS total_deja_paye_a_reception,
    COALESCE(SUM(l.total_amount_remaining), 0)     AS total_a_recouvrer_a_reception
FROM latest_per_credit l
GROUP BY l.new_collector
ORDER BY total_a_recouvrer_a_reception DESC;
