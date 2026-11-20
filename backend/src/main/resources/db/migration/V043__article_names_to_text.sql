-- Noms d'article composés « type: marque modèle [nom] » : jusqu'à ~300 caractères en pratique,
-- au-delà des 255 de varchar(255) (erreur « value too long » à l'insertion d'une demande de stock tontine).
ALTER TABLE public.stock_tontine_request_item ALTER COLUMN item_name TYPE text;
ALTER TABLE public.tontine_delivery_item ALTER COLUMN article_name TYPE text;
ALTER TABLE public.tontine_stock ALTER COLUMN article_name TYPE text;
ALTER TABLE public.tontine_stock_movement ALTER COLUMN article_name TYPE text;
