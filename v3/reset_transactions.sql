-- ==============================================================================
-- RESET TRANSACTIONS SCRIPT
-- WARNING: THIS WILL DELETE ALL SALES, EXPENSES, PURCHASES, AND FINANCIAL DATA.
-- ==============================================================================

BEGIN;

-- 1. Disable Triggers (Optional, but safer to avoid side effects during deletion)
-- We'll just delete in correct order.

-- 2. Delete Transactional Data (Order matters due to FKs)
-- ------------------------------------------------------------------------------

-- Delete Financial Transactions first (they reference accounts, sales, purchases, expenses)
DELETE FROM transactions;

-- Delete Sale Items (references sales)
DELETE FROM sale_items;

-- Delete Sales (references accounts/cash_registers)
DELETE FROM sales;

-- Delete Purchase Items (references purchases)
DELETE FROM purchase_items;

-- Delete Purchases
DELETE FROM purchases;

-- Delete Expenses
DELETE FROM expenses;

-- Delete Expense Categories (Optional, maybe keep them? User said "transacciones")
-- Let's keep categories as they are configuration.

-- 3. Reset Financial Accounts
-- ------------------------------------------------------------------------------
-- We can either delete them or reset balance.
-- Since the system auto-creates them if missing, deleting is cleaner for a "fresh start".
-- However, if we delete them, we lose the "owner_id" association if we don't recreate them correctly.
-- But the triggers recreate them on next sale.
-- Let's DELETE them to be safe and clean.
DELETE FROM accounts;

-- 4. Optional: Reset Stock?
-- User didn't explicitly ask to reset inventory, just "transacciones".
-- But usually a fresh start implies resetting stock to 0 or initial state.
-- I will leave stock AS IS for now, as re-entering products is painful.
-- If they want to reset stock, they can update products set stock = 0;

COMMIT;

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================
SELECT count(*) as sales_count FROM sales;
SELECT count(*) as transactions_count FROM transactions;
SELECT count(*) as accounts_count FROM accounts;
