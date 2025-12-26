-- SQL (Flyway migration)
ALTER TABLE tontine_stock
    ADD CONSTRAINT uk_tontine_stock_commercial_article_year
        UNIQUE (commercial, article_id, year);
