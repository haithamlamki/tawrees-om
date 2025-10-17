-- Ensure partner_id auto-fills for shipping partners on insert
-- 1) Create helper function to set partner_id from user_roles when missing
create or replace function public.set_agreement_partner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fill when missing
  if new.partner_id is null then
    select ur.shipping_partner_id
    into new.partner_id
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'shipping_partner'::app_role
      and ur.shipping_partner_id is not null
    limit 1;
  end if;
  return new;
end;
$$;

-- 2) Create trigger on agreements (runs before RLS WITH CHECK evaluation)
DROP TRIGGER IF EXISTS trg_set_agreement_partner_id ON public.agreements;
create trigger trg_set_agreement_partner_id
before insert on public.agreements
for each row
execute function public.set_agreement_partner_id();