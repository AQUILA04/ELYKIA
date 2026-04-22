-- Step 1: Set account balance to 0 for clients of commercials with new account balances in reports.
-- This ensures that we identify the relevant accounts before resetting the report balances.
UPDATE account
SET account_balance = 0
WHERE client_id IN (
    SELECT id
    FROM client
    WHERE collector IN (
        SELECT DISTINCT commercial_username
        FROM daily_commercial_report
        WHERE new_accounts_balance > 0
    )
);

-- Step 2: Subtract the new account balance from the total amount to deposit and then reset the new account balance to 0.
UPDATE daily_commercial_report
SET
    total_amount_to_deposit = total_amount_to_deposit - new_accounts_balance,
    new_accounts_balance = 0
WHERE
    new_accounts_balance > 0;
