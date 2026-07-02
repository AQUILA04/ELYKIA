-- Ajout du code article et rattrapage des enregistrements existants sans code.
-- Format : 3 premiers caractères du type + 2 de la marque + 2 du modèle
--          + initiales du nom + prix de vente à crédit.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS code VARCHAR(255);

CREATE OR REPLACE FUNCTION article_name_initials(p_name TEXT)
RETURNS TEXT AS $$
    SELECT COALESCE(string_agg(upper(left(word, 1)), ''), '')
    FROM unnest(regexp_split_to_array(trim(p_name), '\s+')) AS word
    WHERE word <> '';
$$ LANGUAGE sql IMMUTABLE;

UPDATE articles a
SET code = upper(left(coalesce(a.type, ''), 3))
         || upper(left(coalesce(a.marque, ''), 2))
         || upper(left(coalesce(a.model, ''), 2))
         || article_name_initials(a.name)
         || CASE
                WHEN a.credit_sale_price = trunc(a.credit_sale_price)
                    THEN trunc(a.credit_sale_price)::bigint::text
                ELSE trim(trailing '0' FROM trim(trailing '.' FROM a.credit_sale_price::text))
            END
WHERE a.code IS NULL OR trim(a.code) = '';

DROP FUNCTION IF EXISTS article_name_initials(TEXT);
