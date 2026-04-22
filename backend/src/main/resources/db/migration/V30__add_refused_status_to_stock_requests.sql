ALTER TABLE stock_request DROP CONSTRAINT IF EXISTS stock_request_status_check;
ALTER TABLE stock_request ADD CONSTRAINT stock_request_status_check CHECK (status IN ('CREATED', 'VALIDATED', 'DELIVERED', 'CANCELLED', 'REFUSED'));

ALTER TABLE stock_tontine_request DROP CONSTRAINT IF EXISTS stock_tontine_request_status_check;
ALTER TABLE stock_tontine_request ADD CONSTRAINT stock_tontine_request_status_check CHECK (status IN ('CREATED', 'VALIDATED', 'DELIVERED', 'CANCELLED', 'REFUSED'));

ALTER TABLE stock_return DROP CONSTRAINT IF EXISTS stock_return_status_check;
ALTER TABLE stock_return ADD CONSTRAINT stock_return_status_check CHECK (status IN ('CREATED', 'RECEIVED', 'CANCELLED', 'REFUSED'));

ALTER TABLE stock_tontine_return DROP CONSTRAINT IF EXISTS stock_tontine_return_status_check;
ALTER TABLE stock_tontine_return ADD CONSTRAINT stock_tontine_return_status_check CHECK (status IN ('CREATED', 'RECEIVED', 'CANCELLED', 'REFUSED'));
