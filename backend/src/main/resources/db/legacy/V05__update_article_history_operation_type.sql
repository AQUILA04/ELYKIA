ALTER TABLE public.article_history DROP CONSTRAINT IF EXISTS article_history_operation_type_check;

ALTER TABLE public.article_history
ADD CONSTRAINT article_history_operation_type_check
CHECK (operation_type IN ('ENTREE', 'SORTIE', 'RESET'));
