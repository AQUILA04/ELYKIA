-- Rattrapage ponctuel : aligne les lots FIFO ouverts sur articles.stock_quantity.
-- Ne change pas la quantité magasin. Ne passe pas par Flyway.
-- Relançable : un second passage ne trouve plus d'écart.
--
-- Prod : docker exec -i elykia-prod-db psql -U elykia_prod -d elykia_prod_db -v ON_ERROR_STOP=1 -f - < ce fichier

BEGIN;

DO $$
DECLARE
    art record;
    lot record;
    to_cut integer;
    cut integer;
    gap integer;
    price double precision;
    trimmed integer := 0;
    raised integer := 0;
BEGIN
    FOR art IN
        SELECT a.id,
               COALESCE(a.stock_quantity, 0) AS stock_qty,
               COALESCE(SUM(l.quantity_remaining) FILTER (WHERE l.quantity_remaining > 0), 0)::integer AS lot_qty,
               a.purchase_price
        FROM articles a
        LEFT JOIN article_stock_lot l ON l.article_id = a.id
        GROUP BY a.id, a.stock_quantity, a.purchase_price
        HAVING COALESCE(a.stock_quantity, 0)
            IS DISTINCT FROM COALESCE(SUM(l.quantity_remaining) FILTER (WHERE l.quantity_remaining > 0), 0)
        ORDER BY a.id
    LOOP
        IF art.lot_qty > art.stock_qty THEN
            to_cut := art.lot_qty - art.stock_qty;
            FOR lot IN
                SELECT id, quantity_remaining, unit_purchase_price
                FROM article_stock_lot
                WHERE article_id = art.id
                  AND status = 'OPEN'
                  AND quantity_remaining > 0
                ORDER BY entry_date, id
                FOR UPDATE
            LOOP
                EXIT WHEN to_cut <= 0;
                cut := LEAST(lot.quantity_remaining, to_cut);
                UPDATE article_stock_lot
                SET quantity_remaining = quantity_remaining - cut,
                    status = CASE WHEN quantity_remaining - cut = 0 THEN 'DEPLETED' ELSE status END,
                    mod_user_id = 'fifo-align',
                    date_mod = now()
                WHERE id = lot.id;

                INSERT INTO article_stock_lot_consumption (
                    reg_user_id, date_reg, visibility, movement_type, quantity,
                    source_type, source_id, unit_purchase_price, lot_id
                ) VALUES (
                    'fifo-align', now(), 'ENABLED', 'ADJUSTMENT', cut,
                    'FIFO_ALIGN', art.id, lot.unit_purchase_price, lot.id
                );

                to_cut := to_cut - cut;
            END LOOP;

            IF to_cut <> 0 THEN
                RAISE EXCEPTION 'Article % : excédent de lots non soldé (%)', art.id, to_cut;
            END IF;
            trimmed := trimmed + 1;
        ELSE
            gap := art.stock_qty - art.lot_qty;
            price := art.purchase_price;
            IF price IS NULL OR price <= 0 THEN
                SELECT i.unit_price
                INTO price
                FROM stock_reception_item i
                JOIN stock_reception r ON r.id = i.stock_reception_id
                WHERE i.article_id = art.id
                  AND r.status = 'VALIDATED'
                  AND i.unit_price > 0
                ORDER BY r.reception_date DESC NULLS LAST, i.id DESC
                LIMIT 1;
            END IF;
            IF price IS NULL OR price <= 0 THEN
                RAISE EXCEPTION 'Article % : prix d''achat manquant pour % unité(s) sans lot', art.id, gap;
            END IF;

            INSERT INTO article_stock_lot (
                reg_user_id, date_reg, visibility, entry_date,
                quantity_initial, quantity_remaining, source_type, status,
                unit_purchase_price, article_id
            ) VALUES (
                'fifo-align', now(), 'ENABLED', CURRENT_DATE,
                gap, gap, 'INVENTORY_ADJUSTMENT', 'OPEN',
                price, art.id
            );
            raised := raised + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'lots soldés sur % article(s), lots créés sur % article(s)', trimmed, raised;
END $$;

DO $$
DECLARE
    leftover integer;
BEGIN
    SELECT COUNT(*) INTO leftover
    FROM (
        SELECT a.id
        FROM articles a
        LEFT JOIN article_stock_lot l ON l.article_id = a.id AND l.quantity_remaining > 0
        GROUP BY a.id, a.stock_quantity
        HAVING COALESCE(a.stock_quantity, 0)
            IS DISTINCT FROM COALESCE(SUM(l.quantity_remaining), 0)
    ) gaps;
    IF leftover <> 0 THEN
        RAISE EXCEPTION 'Écarts stock / lots restants : %', leftover;
    END IF;
END $$;

COMMIT;
