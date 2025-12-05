-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. FINANCIAL MODULE
-- ==========================================

-- ACCOUNTS TABLE (Caja / Bancos)
create table if not exists accounts (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('cash', 'bank')) not null,
  balance numeric not null default 0,
  currency text default 'USD',
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TRANSACTIONS TABLE (Immutable Ledger)
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  account_id uuid references accounts(id),
  type text check (type in ('income', 'expense')) not null,
  amount numeric not null,
  description text,
  reference_type text check (reference_type in ('sale', 'purchase', 'expense', 'manual')),
  reference_id uuid, -- Can be sale_id, purchase_id, expense_id
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 2. MULTI-USER MODULE
-- ==========================================

-- TEAM MEMBERS TABLE
create table if not exists team_members (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  owner_id uuid references auth.users(id) not null, -- The company owner
  role text check (role in ('admin', 'cashier')) not null default 'cashier',
  status text check (status in ('active', 'invited')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, owner_id)
);

-- ==========================================
-- 3. HELPER FUNCTIONS & RLS
-- ==========================================

-- Function to get the company owner ID for the current user
-- If user is owner, returns their own ID.
-- If user is employee, returns their boss's ID.
create or replace function get_my_company_id()
returns uuid as $$
declare
  v_owner_id uuid;
begin
  -- Check if user is an owner (exists in profiles)
  select id into v_owner_id from profiles where id = auth.uid();
  
  if v_owner_id is not null then
    return v_owner_id;
  end if;

  -- Check if user is a team member
  select owner_id into v_owner_id from team_members where user_id = auth.uid() and status = 'active';
  
  return v_owner_id;
end;
$$ language plpgsql security definer;

-- ==========================================
-- 4. FINANCIAL LOGIC (RPCs)
-- ==========================================

-- RPC to process a SALE and update account balance
create or replace function process_sale_transaction(
  p_sale_id uuid,
  p_total numeric,
  p_payment_method text -- 'Efectivo' or 'Tarjeta'
) returns void as $$
declare
  v_account_id uuid;
  v_account_type text;
begin
  -- Determine account type based on payment method
  if p_payment_method = 'Efectivo' then
    v_account_type := 'cash';
  else
    v_account_type := 'bank';
  end if;

  -- Find default account for that type
  select id into v_account_id from accounts 
  where type = v_account_type 
  limit 1;

  -- If no account exists, create a default one
  if v_account_id is null then
    insert into accounts (name, type, is_default)
    values (
      case when v_account_type = 'cash' then 'Caja General' else 'Banco Principal' end,
      v_account_type,
      true
    ) returning id into v_account_id;
  end if;

  -- Create Transaction
  insert into transactions (account_id, type, amount, description, reference_type, reference_id, date)
  values (
    v_account_id,
    'income',
    p_total,
    'Venta #' || p_sale_id,
    'sale',
    p_sale_id,
    now()
  );

  -- Update Balance
  update accounts set balance = balance + p_total where id = v_account_id;
end;
$$ language plpgsql;

-- RPC to process an EXPENSE and update account balance
create or replace function process_expense_transaction(
  p_expense_id uuid,
  p_amount numeric,
  p_description text
) returns void as $$
declare
  v_account_id uuid;
begin
  -- For now, assume expenses come from Cash (can be improved later to select account)
  select id into v_account_id from accounts where type = 'cash' limit 1;

  if v_account_id is null then
     insert into accounts (name, type, is_default) values ('Caja General', 'cash', true) returning id into v_account_id;
  end if;

  -- Create Transaction
  insert into transactions (account_id, type, amount, description, reference_type, reference_id, date)
  values (
    v_account_id,
    'expense',
    p_amount,
    p_description,
    'expense',
    p_expense_id,
    now()
  );

  -- Update Balance
  update accounts set balance = balance - p_amount where id = v_account_id;
end;
$$ language plpgsql;

-- RPC to process a PURCHASE and update account balance
create or replace function process_purchase_transaction(
  p_purchase_id uuid,
  p_total numeric,
  p_supplier text
) returns void as $$
declare
  v_account_id uuid;
begin
  -- Assume purchases come from Cash for now
  select id into v_account_id from accounts where type = 'cash' limit 1;

   if v_account_id is null then
     insert into accounts (name, type, is_default) values ('Caja General', 'cash', true) returning id into v_account_id;
  end if;

  -- Create Transaction
  insert into transactions (account_id, type, amount, description, reference_type, reference_id, date)
  values (
    v_account_id,
    'expense',
    p_total,
    'Compra a ' || p_supplier,
    'purchase',
    p_purchase_id,
    now()
  );

  -- Update Balance
  update accounts set balance = balance - p_total where id = v_account_id;
end;
$$ language plpgsql;
