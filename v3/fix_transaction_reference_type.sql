-- ==============================================================================
-- FIX TRANSACTION REFERENCE TYPE
-- Problem: Sales IDs are BigInt, but Transactions.reference_id was UUID.
-- Solution: Change reference_id to TEXT to support both UUIDs and BigInts.
-- ==============================================================================

-- 1. Change Column Type
-- ------------------------------------------------------------------------------
ALTER TABLE transactions 
ALTER COLUMN reference_id TYPE text USING reference_id::text;

-- 2. Update Triggers to cast to TEXT
-- ------------------------------------------------------------------------------

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
  VALUES (v_account_id, 'income', new.total, 'Venta #' || new.id, 'sale', new.id::text, new.created_at, v_owner_id);

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
  VALUES (v_account_id, 'expense', new.amount, new.description, 'expense', new.id::text, new.date, v_owner_id);

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
  VALUES (v_account_id, 'expense', new.total, 'Compra a ' || new.supplier_name, 'purchase', new.id::text, new.date, v_owner_id);

  -- Update Balance
  UPDATE accounts SET balance = balance - new.total WHERE id = v_account_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
