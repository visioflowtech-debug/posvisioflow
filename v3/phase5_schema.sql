-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- PURCHASES TABLES
create table if not exists purchases (
  id uuid default uuid_generate_v4() primary key,
  supplier_name text,
  total numeric not null default 0,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists purchase_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_id uuid references purchases(id) on delete cascade,
  product_id bigint references products(id),
  quantity integer not null,
  cost_price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EXPENSES TABLES
create table if not exists expense_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references expense_categories(id),
  amount numeric not null,
  description text,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RPC FUNCTION TO PROCESS PURCHASE (Update Stock)
create or replace function process_purchase(
  p_supplier_name text,
  p_total numeric,
  p_items jsonb
) returns uuid as $$
declare
  new_purchase_id uuid;
  item jsonb;
begin
  -- Create Purchase Record
  insert into purchases (supplier_name, total)
  values (p_supplier_name, p_total)
  returning id into new_purchase_id;

  -- Process Items
  for item in select * from jsonb_array_elements(p_items)
  loop
    -- Insert Purchase Item
    insert into purchase_items (purchase_id, product_id, quantity, cost_price)
    values (
      new_purchase_id,
      (item->>'product_id')::bigint,
      (item->>'quantity')::int,
      (item->>'cost_price')::numeric
    );

    -- Update Product Stock
    update products
    set stock = stock + (item->>'quantity')::int
    where id = (item->>'product_id')::bigint;
  end loop;

  return new_purchase_id;
end;
$$ language plpgsql;
