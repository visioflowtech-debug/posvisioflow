-- Add product_id column to sale_items table
alter table public.sale_items
add column if not exists product_id bigint references public.products(id);
