-- Optional reseed script. Edit outcomes here later as needed.
truncate table public.transactions restart identity cascade;
truncate table public.user_holdings restart identity cascade;
truncate table public.market_pools restart identity cascade;
truncate table public.markets restart identity cascade;
truncate table public.users restart identity cascade;

-- Re-run the insert section from schema.sql or keep a custom seed flow here.
