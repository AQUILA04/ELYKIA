-- Commercial Stock — reprise idempotente des soldes courants legacy vers le modèle continu (Phase 2).
--  * CREDIT  : lignes commercial_monthly_stock_item avec quantity_remaining > 0 (tous mois confondus ; la mise en dette remet
--              déjà quantity_remaining à 0), une couche FIFO par ligne mensuelle (acquired_at = 1er jour du mois).
--  * TONTINE : tontine_stock avec available_quantity > 0, couches copiées depuis tontine_stock_layer si leur somme est
--              cohérente, sinon une couche unique au solde disponible.
-- Chaque position reçoit une écriture d'ouverture (STOCK_IN / LEGACY_MIGRATION) pour que le ledger redonne le solde.
-- L'historique antérieur à la reprise reste consultable dans les tables legacy (archives).
-- Les tables legacy ne sont jamais modifiées. Rejouable sans effet : garde NOT EXISTS sur LEGACY_MIGRATION.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.commercial_stock_ledger_entry WHERE reference_type = 'LEGACY_MIGRATION') THEN
        RAISE NOTICE 'V048 : reprise legacy déjà effectuée, aucune action.';
        RETURN;
    END IF;

    -- ================= CREDIT =================
    CREATE TEMP TABLE tmp_cs_credit ON COMMIT DROP AS
    SELECT s.collector,
           i.article_id,
           i.quantity_remaining                                                   AS qty,
           COALESCE(NULLIF(i.weighted_average_purchase_price, 0), NULLIF(i.last_purchase_price, 0), a.purchase_price, 0) AS cost,
           COALESCE(NULLIF(i.weighted_average_unit_price, 0), NULLIF(i.last_unit_price, 0), a.credit_sale_price)         AS sale_price,
           make_date(s.year, s.month, 1)::timestamp                               AS acquired_at,
           i.id                                                                   AS legacy_item_id
    FROM public.commercial_monthly_stock_item i
    JOIN public.commercial_monthly_stock s ON s.id = i.monthly_stock_id
    JOIN public.articles a ON a.id = i.article_id
    WHERE i.quantity_remaining > 0;

    INSERT INTO public.commercial_stock_position (collector, article_id, activity_type, quantity_on_hand)
    SELECT collector, article_id, 'CREDIT', SUM(qty)
    FROM tmp_cs_credit
    GROUP BY collector, article_id
    ON CONFLICT (collector, article_id, activity_type) DO NOTHING;

    INSERT INTO public.commercial_stock_layer (position_id, quantity_initial, quantity_remaining, unit_purchase_cost,
                                               initial_sale_price, effective_sale_price, source_type, source_id, acquired_at)
    SELECT p.id, c.qty, c.qty, c.cost, c.sale_price, c.sale_price, 'LEGACY_MIGRATION', c.legacy_item_id, c.acquired_at
    FROM tmp_cs_credit c
    JOIN public.commercial_stock_position p
      ON p.collector = c.collector AND p.article_id = c.article_id AND p.activity_type = 'CREDIT';

    -- ================= TONTINE =================
    CREATE TEMP TABLE tmp_cs_tontine_layers ON COMMIT DROP AS
    WITH layer_sum AS (
        SELECT l.tontine_stock_id, SUM(l.quantity_remaining) AS remaining
        FROM public.tontine_stock_layer l
        WHERE l.quantity_remaining > 0
        GROUP BY l.tontine_stock_id
    )
    SELECT ts.commercial AS collector,
           ts.article_id,
           l.quantity_remaining AS qty,
           l.unit_purchase_price AS cost,
           COALESCE(l.unit_sale_price, ts.unit_price, a.selling_price) AS sale_price,
           l.packaging_type, l.units_per_package, l.units_per_half_package,
           l.wholesale_sale_price, l.half_wholesale_sale_price,
           COALESCE(ts.date_reg, make_date(ts.year, 1, 1)::timestamp) AS acquired_at,
           l.id AS legacy_layer_id
    FROM public.tontine_stock ts
    JOIN layer_sum x ON x.tontine_stock_id = ts.id AND x.remaining = ts.available_quantity
    JOIN public.tontine_stock_layer l ON l.tontine_stock_id = ts.id AND l.quantity_remaining > 0
    JOIN public.articles a ON a.id = ts.article_id
    WHERE ts.available_quantity > 0
    UNION ALL
    SELECT ts.commercial, ts.article_id, ts.available_quantity,
           COALESCE(NULLIF(a.purchase_price, 0), 0),
           COALESCE(ts.unit_price, a.selling_price),
           NULL, NULL, NULL, NULL, NULL,
           COALESCE(ts.date_reg, make_date(ts.year, 1, 1)::timestamp),
           NULL
    FROM public.tontine_stock ts
    JOIN public.articles a ON a.id = ts.article_id
    WHERE ts.available_quantity > 0
      AND NOT EXISTS (
          SELECT 1 FROM layer_sum x
          WHERE x.tontine_stock_id = ts.id AND x.remaining = ts.available_quantity);

    INSERT INTO public.commercial_stock_position (collector, article_id, activity_type, quantity_on_hand)
    SELECT collector, article_id, 'TONTINE', SUM(qty)
    FROM tmp_cs_tontine_layers
    GROUP BY collector, article_id
    ON CONFLICT (collector, article_id, activity_type) DO NOTHING;

    INSERT INTO public.commercial_stock_layer (position_id, quantity_initial, quantity_remaining, unit_purchase_cost,
                                               initial_sale_price, effective_sale_price, packaging_type, units_per_package,
                                               units_per_half_package, wholesale_sale_price, half_wholesale_sale_price,
                                               source_type, source_id, acquired_at)
    SELECT p.id, t.qty, t.qty, t.cost, t.sale_price, t.sale_price, t.packaging_type, t.units_per_package,
           t.units_per_half_package, t.wholesale_sale_price, t.half_wholesale_sale_price,
           'LEGACY_MIGRATION', t.legacy_layer_id, t.acquired_at
    FROM tmp_cs_tontine_layers t
    JOIN public.commercial_stock_position p
      ON p.collector = t.collector AND p.article_id = t.article_id AND p.activity_type = 'TONTINE';

    -- ================= Caches de lecture des positions =================
    UPDATE public.commercial_stock_position p
    SET quantity_on_hand = x.qty,
        weighted_avg_purchase_cost = x.avg_cost,
        current_sale_unit_price = x.last_price
    FROM (
        SELECT l.position_id,
               SUM(l.quantity_remaining) AS qty,
               SUM(l.quantity_remaining * l.unit_purchase_cost) / NULLIF(SUM(l.quantity_remaining), 0) AS avg_cost,
               (ARRAY_AGG(l.effective_sale_price ORDER BY l.acquired_at DESC, l.id DESC)
                    FILTER (WHERE l.effective_sale_price IS NOT NULL))[1] AS last_price
        FROM public.commercial_stock_layer l
        WHERE l.quantity_remaining > 0 AND l.source_type = 'LEGACY_MIGRATION'
        GROUP BY l.position_id
    ) x
    WHERE p.id = x.position_id;

    -- ================= Écritures d'ouverture =================
    INSERT INTO public.commercial_stock_ledger_entry (
        position_id, collector, article_id, activity_type, movement_type, delta_quantity, quantity_before, quantity_after,
        unit_purchase_cost, unit_sale_price, total_purchase_value, total_sale_value, margin_amount,
        reference_type, reference_code, accounting_date, occurred_at, backdated, performed_by)
    SELECT p.id, p.collector, p.article_id, p.activity_type, 'STOCK_IN', p.quantity_on_hand, 0, p.quantity_on_hand,
           p.weighted_avg_purchase_cost, p.current_sale_unit_price,
           p.quantity_on_hand * p.weighted_avg_purchase_cost,
           p.quantity_on_hand * p.current_sale_unit_price,
           p.quantity_on_hand * (COALESCE(p.current_sale_unit_price, 0) - COALESCE(p.weighted_avg_purchase_cost, 0)),
           'LEGACY_MIGRATION', 'V048', CURRENT_DATE, CURRENT_TIMESTAMP, FALSE, 'migration-v048'
    FROM public.commercial_stock_position p
    WHERE p.quantity_on_hand > 0;
END
$$;
