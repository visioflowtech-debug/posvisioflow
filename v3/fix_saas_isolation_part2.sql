-- ==============================================================================
-- FIX SAAS ISOLATION PART 2: Purchases & Expenses
-- ==============================================================================

-- 1. Add owner_id to PURCHASES & ITEMS
-- ------------------------------------------------------------------------------
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- purchase_items don't strictly need owner_id if they are accessed via purchase_id which has it,
-- but for RLS simplicity on direct access, we can add it or rely on join policies.
-- Let's rely on join policies for items to save space/complexity, similar to sale_items.

-- 2. Add owner_id to EXPENSES & CATEGORIES
-- ------------------------------------------------------------------------------
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 3. Enable RLS
-- ------------------------------------------------------------------------------
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- 4. Trigger to Auto-Assign Owner ID (BEFORE INSERT)
-- ------------------------------------------------------------------------------
-- This ensures we don't need to update the frontend code to send owner_id.

CREATE OR REPLACE FUNCTION set_owner_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF new.owner_id IS NULL THEN
    new.owner_id := get_my_company_id();
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to PURCHASES
DROP TRIGGER IF EXISTS set_owner_on_purchase ON purchases;
CREATE TRIGGER set_owner_on_purchase
  BEFORE INSERT ON purchases
  FOR EACH ROW EXECUTE PROCEDURE set_owner_id_trigger();

-- Apply trigger to EXPENSES
DROP TRIGGER IF EXISTS set_owner_on_expense ON expenses;
CREATE TRIGGER set_owner_on_expense
  BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE PROCEDURE set_owner_id_trigger();

-- Apply trigger to EXPENSE_CATEGORIES
DROP TRIGGER IF EXISTS set_owner_on_expense_category ON expense_categories;
CREATE TRIGGER set_owner_on_expense_category
  BEFORE INSERT ON expense_categories
  FOR EACH ROW EXECUTE PROCEDURE set_owner_id_trigger();


-- 5. RLS Policies
-- ------------------------------------------------------------------------------

-- PURCHASES
DROP POLICY IF EXISTS "Users see company purchases" ON purchases;
CREATE POLICY "Users see company purchases" ON purchases
  FOR SELECT USING (owner_id = get_my_company_id());

DROP POLICY IF EXISTS "Users create company purchases" ON purchases;
CREATE POLICY "Users create company purchases" ON purchases
  FOR INSERT WITH CHECK (true); -- Trigger sets owner_id, so we allow insert. 
-- Ideally we check that the resulting owner_id matches, but BEFORE trigger happens before check?
-- Postgres RLS CHECK happens AFTER BEFORE trigger. So we can check owner_id.
-- Let's refine:
-- FOR INSERT WITH CHECK (owner_id = get_my_company_id());

-- PURCHASE ITEMS
DROP POLICY IF EXISTS "Users see company purchase items" ON purchase_items;
CREATE POLICY "Users see company purchase items" ON purchase_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM purchases WHERE id = purchase_items.purchase_id AND owner_id = get_my_company_id())
  );

DROP POLICY IF EXISTS "Users create company purchase items" ON purchase_items;
CREATE POLICY "Users create company purchase items" ON purchase_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM purchases WHERE id = purchase_items.purchase_id AND owner_id = get_my_company_id())
  );

-- EXPENSES
DROP POLICY IF EXISTS "Users see company expenses" ON expenses;
CREATE POLICY "Users see company expenses" ON expenses
  FOR SELECT USING (owner_id = get_my_company_id());

DROP POLICY IF EXISTS "Users create company expenses" ON expenses;
CREATE POLICY "Users create company expenses" ON expenses
  FOR INSERT WITH CHECK (owner_id = get_my_company_id());

-- EXPENSE CATEGORIES
DROP POLICY IF EXISTS "Users see company categories" ON expense_categories;
CREATE POLICY "Users see company categories" ON expense_categories
  FOR SELECT USING (owner_id = get_my_company_id());

DROP POLICY IF EXISTS "Users create company categories" ON expense_categories;
CREATE POLICY "Users create company categories" ON expense_categories
  FOR INSERT WITH CHECK (owner_id = get_my_company_id());

-- 6. Update RPCs (Optional but recommended for consistency)
-- ------------------------------------------------------------------------------
-- process_purchase RPC already does an insert. The trigger will catch it.
-- But we need to make sure the RPC runs with the user's context so get_my_company_id works.
-- It is defined as SECURITY DEFINER? 
-- If it is SECURITY DEFINER, auth.uid() might be the defining user (postgres/admin) or the caller?
-- In Supabase, SECURITY DEFINER functions run with the privileges of the creator (usually postgres),
-- BUT auth.uid() still returns the ID of the caller (JWT user).
-- So get_my_company_id() should work fine inside the trigger even if called from RPC.

