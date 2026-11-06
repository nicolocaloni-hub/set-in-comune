-- Duration pricing: an optional flat weekend price and an optional weekly discount.
-- The server computes the total on insert, so the client never decides amounts.
-- Rules (kept identical to quoteRental in src/domain.js):
--  * standard total = daily price × inclusive days;
--  * 7 days or more with a weekly discount: standard × (100 − pct) / 100, rounded to cents;
--  * weekend: pickup on Friday or Saturday, return on Sunday or Monday, 2–4 days,
--    total = weekend price when it is lower than the standard total.
-- Apply once, after 20261107090000_profile_portfolio.
begin;
alter table public.listings
 add column weekend_price numeric(10,2) check (weekend_price between 0 and 10000),
 add column weekly_discount_pct integer not null default 0 check (weekly_discount_pct between 0 and 50);
grant insert(weekend_price,weekly_discount_pct),update(weekend_price,weekly_discount_pct) on public.listings to authenticated;
alter table public.bookings add column price_rule text not null default 'daily' check (price_rule in ('daily','weekly','weekend'));

create function private.duration_quote(p_price numeric,p_weekend numeric,p_pct integer,p_start date,p_end date,out total numeric,out rule text)
 language plpgsql immutable set search_path='' as $$
declare days integer:=p_end-p_start+1;
begin
 total:=p_price*days;rule:='daily';
 if days>=7 and coalesce(p_pct,0)>0 then total:=round(p_price*days*(100-p_pct)/100.0,2);rule:='weekly';end if;
 if p_weekend is not null and days between 2 and 4 and extract(isodow from p_start) in (5,6) and extract(isodow from p_end) in (7,1) and p_weekend<total then
  total:=p_weekend;rule:='weekend';
 end if;
end;$$;

create function private.apply_duration_pricing() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.listings;q record;
begin
 select * into l from public.listings where id=new.listing_id;
 if found then
  select * into q from private.duration_quote(l.price,l.weekend_price,l.weekly_discount_pct,new.start_date,new.end_date);
  new.total:=q.total;new.price_rule:=q.rule;
 end if;
 return new;
end;$$;
revoke all on function private.duration_quote(numeric,numeric,integer,date,date),private.apply_duration_pricing() from public,anon,authenticated;
create trigger price_by_duration before insert on public.bookings for each row execute function private.apply_duration_pricing();
commit;
