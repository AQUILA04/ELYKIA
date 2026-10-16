-- Photo réduite (JPEG) des articles et des types d'article. La colonne stocke la clé MinIO, pas le fichier.

ALTER TABLE public.articles
    ADD COLUMN IF NOT EXISTS photo_object_key character varying(255);

ALTER TABLE public.article_type
    ADD COLUMN IF NOT EXISTS photo_object_key character varying(255);
