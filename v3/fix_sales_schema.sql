-- Add missing column to sales table
alter table public.sales
add column if not exists cash_register_id bigint references public.cash_registers(id);
