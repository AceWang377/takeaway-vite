create or replace function public.public_update_order_payment_method(
  p_order_id text,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_payment_method not in ('other', 'wechat', 'transfer', 'cash') then
    raise exception 'Unsupported payment method: %', p_payment_method;
  end if;

  update public.orders
  set payment_method = p_payment_method
  where id = p_order_id;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;
end;
$$;

revoke all on function public.public_update_order_payment_method(text, text) from public;
grant execute on function public.public_update_order_payment_method(text, text) to anon, authenticated;
