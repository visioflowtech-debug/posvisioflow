-- ==========================================
-- 1. AUTOMATIC FINANCIAL TRIGGERS
-- ==========================================

-- Function to handle NEW SALE -> Income Transaction
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

  -- Create Transaction
  insert into transactions (account_id, type, amount, description, reference_type, reference_id, date)
  values (v_account_id, 'income', new.total, 'Venta #' || new.id, 'sale', new.id::uuid, new.created_at);

  -- Update Balance
  update accounts set balance = balance + new.total where id = v_account_id;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for Sales
drop trigger if exists on_sale_created on sales;
create trigger on_sale_created
  after insert on sales
  for each row execute procedure handle_new_sale();


-- Function to handle NEW EXPENSE -> Expense Transaction
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
  values (v_account_id, 'expense', new.amount, new.description, 'expense', new.id, new.date);

  -- Update Balance
  update accounts set balance = balance - new.amount where id = v_account_id;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for Expenses
drop trigger if exists on_expense_created on expenses;
create trigger on_expense_created
  after insert on expenses
  for each row execute procedure handle_new_expense();


-- Function to handle NEW PURCHASE -> Expense Transaction
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
  values (v_account_id, 'expense', new.total, 'Compra a ' || new.supplier_name, 'purchase', new.id, new.date);

  -- Update Balance
  update accounts set balance = balance - new.total where id = v_account_id;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for Purchases
drop trigger if exists on_purchase_created on purchases;
create trigger on_purchase_created
  after insert on purchases
  for each row execute procedure handle_new_purchase();


-- ==========================================
-- 2. MULTI-USER RLS POLICIES
-- ==========================================

-- Helper function to check if user has access to a resource owner
create or replace function has_access_to_data(resource_owner_id uuid)
returns boolean as $$
begin
  -- 1. Own data
  if resource_owner_id = auth.uid() then
    return true;
  end if;

  -- 2. Team member access
  if exists (
    select 1 from team_members 
    where user_id = auth.uid() 
    and owner_id = resource_owner_id 
    and status = 'active'
  ) then
    return true;
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- Update Policies for PRODUCTS
drop policy if exists "Usuarios ven sus productos" on products;
create policy "Access products" on products
  for select using (has_access_to_data(user_id));

drop policy if exists "Usuarios crean sus productos" on products;
create policy "Create products" on products
  for insert with check (auth.uid() = user_id); -- Only owner creates for now, or check role

drop policy if exists "Usuarios editan sus productos" on products;
create policy "Edit products" on products
  for update using (has_access_to_data(user_id));

-- Update Policies for SALES
drop policy if exists "Usuarios ven sus ventas" on sales;
create policy "Access sales" on sales
  for select using (has_access_to_data(user_id));

drop policy if exists "Usuarios crean ventas" on sales;
create policy "Create sales" on sales
  for insert with check (has_access_to_data(user_id));

-- Update Policies for SALE_ITEMS
drop policy if exists "Usuarios ven items de sus ventas" on sale_items;
create policy "Access sale items" on sale_items
  for select using (
    exists (select 1 from sales where sales.id = sale_items.sale_id and has_access_to_data(sales.user_id))
  );

drop policy if exists "Usuarios crean items en sus ventas" on sale_items;
create policy "Create sale items" on sale_items
  for insert with check (
    exists (select 1 from sales where sales.id = sale_items.sale_id and has_access_to_data(sales.user_id))
  );

-- Allow searching profiles by email (for Team Invite)
create policy "Read basic profile info" on profiles
  for select to authenticated
  using (true);

-- Team Members Policies
alter table team_members enable row level security;

create policy "Owners manage their team" on team_members
  for all using (owner_id = auth.uid());

create policy "Members see their own membership" on team_members
  for select using (user_id = auth.uid());
