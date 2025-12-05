-- ==============================================================================
-- FIX SAAS ISOLATION: Enforce strict multi-tenancy for Financial Data
-- ==============================================================================

-- 1. Add owner_id to ACCOUNTS
-- ------------------------------------------------------------------------------
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update existing accounts to belong to the user who created them (if possible)
-- or default to the current user if running this script manually.
-- For a clean slate, we might want to truncate, but let's try to preserve if we can.
-- For now, we will leave them null and RLS might hide them, or we update them manually.
-- A safe bet for existing data in dev is to set it to the current auth.uid() if running in dashboard,
-- but triggers run as system.
-- Let's make it nullable for now, but enforce it in RLS/Triggers.

-- 2. Add owner_id to TRANSACTIONS
-- ------------------------------------------------------------------------------
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 3. Enable RLS on Financial Tables
-- ------------------------------------------------------------------------------
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for ACCOUNTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company accounts" ON accounts;
CREATE POLICY "Users can view their company accounts" ON accounts
  FOR SELECT USING (
    owner_id = get_my_company_id()
  );

DROP POLICY IF EXISTS "Users can insert their company accounts" ON accounts;
CREATE POLICY "Users can insert their company accounts" ON accounts
  FOR INSERT WITH CHECK (
    owner_id = get_my_company_id()
  );

DROP POLICY IF EXISTS "Users can update their company accounts" ON accounts;
CREATE POLICY "Users can update their company accounts" ON accounts
  FOR UPDATE USING (
    owner_id = get_my_company_id()
  );

-- 5. RLS Policies for TRANSACTIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company transactions" ON transactions;
CREATE POLICY "Users can view their company transactions" ON transactions
  FOR SELECT USING (
    owner_id = get_my_company_id()
  );

DROP POLICY IF EXISTS "Users can insert their company transactions" ON transactions;
CREATE POLICY "Users can insert their company transactions" ON transactions
  FOR INSERT WITH CHECK (
    owner_id = get_my_company_id()
  );

-- 6. Update Triggers to be Multi-Tenant Aware
-- ------------------------------------------------------------------------------

-- Helper to get owner_id inside a trigger (where auth.uid() might not be reliable if called by system)
-- Actually, for sales/expenses created by user, auth.uid() is reliable.
-- But let's use the user_id from the record to be safe.

CREATE OR REPLACE FUNCTION get_owner_id_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Check if user is an owner
  SELECT id INTO v_owner_id FROM profiles WHERE id = p_user_id;
  
  IF v_owner_id IS NOT NULL THEN
    RETURN v_owner_id;
  END IF;

  -- Check if user is a team member
  SELECT owner_id INTO v_owner_id FROM team_members WHERE user_id = p_user_id AND status = 'active';
  
  RETURN v_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update handle_new_sale
CREATE OR REPLACE FUNCTION handle_new_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_account_type TEXT;
  v_owner_id UUID;
BEGIN
  -- Get Owner ID
  v_owner_id := get_owner_id_for_user(new.user_id);
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'User % has no company owner', new.user_id;
  END IF;

  -- Determine account type
  IF new.payment_method = 'Efectivo' THEN
    v_account_type := 'cash';
  ELSE
    v_account_type := 'bank';
  END IF;

  -- Find Account for THIS company
  SELECT id INTO v_account_id 
  FROM accounts 
  WHERE type = v_account_type 
    AND owner_id = v_owner_id 
  LIMIT 1;

  -- Create Account if missing
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (name, type, is_default, owner_id) 
    VALUES (
      CASE WHEN v_account_type = 'cash' THEN 'Caja General' ELSE 'Banco Principal' END, 
      v_account_type, 
      true,
      v_owner_id
    )
    RETURNING id INTO v_account_id;
  END IF;

  -- Create Transaction
  INSERT INTO transactions (account_id, type, amount, description, reference_type, reference_id, date, owner_id)
  VALUES (v_account_id, 'income', new.total, 'Venta #' || new.id, 'sale', new.id::uuid, new.created_at, v_owner_id);

  -- Update Balance
  UPDATE accounts SET balance = balance + new.total WHERE id = v_account_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update handle_new_expense
CREATE OR REPLACE FUNCTION handle_new_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_owner_id UUID;
BEGIN
  -- Get Owner ID (assuming expenses have user_id, if not we use auth.uid())
  -- Expenses table usually has user_id. If not, we need to add it or rely on auth.uid()
  -- Let's assume auth.uid() for now as expenses are created by logged in user.
  v_owner_id := get_my_company_id(); 

  -- Assume Cash
  SELECT id INTO v_account_id FROM accounts WHERE type = 'cash' AND owner_id = v_owner_id LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (name, type, is_default, owner_id) 
    VALUES ('Caja General', 'cash', true, v_owner_id) 
    RETURNING id INTO v_account_id;
  END IF;

  -- Create Transaction
  INSERT INTO transactions (account_id, type, amount, description, reference_type, reference_id, date, owner_id)
  VALUES (v_account_id, 'expense', new.amount, new.description, 'expense', new.id, new.date, v_owner_id);

  -- Update Balance
  UPDATE accounts SET balance = balance - new.amount WHERE id = v_account_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update handle_new_purchase
CREATE OR REPLACE FUNCTION handle_new_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_owner_id UUID;
BEGIN
  -- Get Owner ID
  v_owner_id := get_my_company_id();

  -- Assume Cash
  SELECT id INTO v_account_id FROM accounts WHERE type = 'cash' AND owner_id = v_owner_id LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (name, type, is_default, owner_id) 
    VALUES ('Caja General', 'cash', true, v_owner_id) 
    RETURNING id INTO v_account_id;
  END IF;

  -- Create Transaction
  INSERT INTO transactions (account_id, type, amount, description, reference_type, reference_id, date, owner_id)
  VALUES (v_account_id, 'expense', new.total, 'Compra a ' || new.supplier_name, 'purchase', new.id, new.date, v_owner_id);

  -- Update Balance
  UPDATE accounts SET balance = balance - new.total WHERE id = v_account_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fix Profiles Privacy
-- ------------------------------------------------------------------------------
-- Only allow viewing profiles if:
-- 1. It's your own profile
-- 2. It's your boss's profile (owner_id in team_members)
-- 3. It's your employee's profile (you are the owner_id in team_members)

DROP POLICY IF EXISTS "Read basic profile info" ON profiles;
CREATE POLICY "Strict profile visibility" ON profiles
  FOR SELECT USING (
    id = auth.uid() -- Own profile
    OR id IN (SELECT owner_id FROM team_members WHERE user_id = auth.uid() AND status = 'active') -- My Boss
    OR id IN (SELECT user_id FROM team_members WHERE owner_id = auth.uid()) -- My Employees
  );

