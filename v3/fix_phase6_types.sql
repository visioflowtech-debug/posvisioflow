-- 1. Change reference_id to TEXT to support both UUID (Purchases/Expenses) and BigInt (Sales)
alter table public.transactions
alter column reference_id type text;

-- 2. Update Trigger Function for SALES (BigInt -> Text)
create or replace function handle_new_sale()
returns trigger as $$
declare
  v_account_id uuid;
  v_account_type text;
begin
  -- Determine account type
  if new.payment_method = 'Efectivo' then
    v_account_type := 'cash';
  else
    v_account_type := 'bank';
  end if;

  -- Find or Create Account
  select id into v_account_id from accounts where type = v_account_type limit 1;
  if v_account_id is null then
    insert into accounts (name, type, is_default) 
    values (case when v_account_type = 'cash' then 'Caja General' else 'Banco Principal' end, v_account_type, true)
    returning id into v_account_id;
  end if;

  -- Create Transaction (Cast ID to TEXT)
  insert into transactions (account_id, type, amount, description, reference_type, reference_id, date)
  values (v_account_id, 'income', new.total, 'Venta #' || new.id, 'sale', new.id::text, new.created_at);

  -- Update Balance
  update accounts set balance = balance + new.total where id = v_account_id;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Update Trigger Function for EXPENSES (UUID -> Text)
create or replace function handle_new_expense()
returns trigger as $$
declare
  v_account_id uuid;
begin
  -- Assume Cash
  select id into v_account_id from accounts where type = 'cash' limit 1;
  if v_account_id is null then
    insert into accounts (name, type, is_default) values ('Caja General', 'cash', true) returning id into v_account_id;
  end if;

  -- Create Transaction
  insert into transactions (account_id, type, amount, description, reference_type, reference_id, date)
  values (v_account_id, 'expense', new.amount, new.description, 'expense', new.id::text, new.date);

  -- Update Balance
  update accounts set balance = balance - new.amount where id = v_account_id;

  return new;
end;
$$ language plpgsql security definer;

-- 4. Update Trigger Function for PURCHASES (UUID -> Text)
create or replace function handle_new_purchase()
returns trigger as $$
declare
  v_account_id uuid;
begin
  -- Assume Cash
  select id into v_account_id from accounts where type = 'cash' limit 1;
  if v_account_id is null then
    insert into accounts (name, type, is_default) values ('Caja General', 'cash', true) returning id into v_account_id;
  end if;

  -- Create Transaction
  insert into transactions (account_id, type, amount, description, reference_type, reference_id, date)
  values (v_account_id, 'expense', new.total, 'Compra a ' || new.supplier_name, 'purchase', new.id::text, new.date);

  -- Update Balance
  update accounts set balance = balance - new.total where id = v_account_id;

  return new;
end;
$$ language plpgsql security definer;
