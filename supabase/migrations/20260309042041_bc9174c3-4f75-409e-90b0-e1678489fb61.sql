-- Leaderboard season/settings
create table if not exists public.leaderboard_settings (
  id int primary key,
  season_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_settings'
      and policyname = 'Public can read leaderboard settings'
  ) then
    create policy "Public can read leaderboard settings"
    on public.leaderboard_settings
    for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_settings'
      and policyname = 'Admins can manage leaderboard settings'
  ) then
    create policy "Admins can manage leaderboard settings"
    on public.leaderboard_settings
    for all
    to authenticated
    using (is_current_user_admin())
    with check (is_current_user_admin());
  end if;
end $$;

-- Upsert the singleton row (and reset season start to now)
insert into public.leaderboard_settings (id, season_started_at)
values (1, now())
on conflict (id)
do update set season_started_at = excluded.season_started_at,
              updated_at = now();


-- Rank -> points configuration
create table if not exists public.leaderboard_rank_points (
  rank int primary key,
  points int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_rank_points enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_rank_points'
      and policyname = 'Public can read leaderboard rank points'
  ) then
    create policy "Public can read leaderboard rank points"
    on public.leaderboard_rank_points
    for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_rank_points'
      and policyname = 'Admins can manage leaderboard rank points'
  ) then
    create policy "Admins can manage leaderboard rank points"
    on public.leaderboard_rank_points
    for all
    to authenticated
    using (is_current_user_admin())
    with check (is_current_user_admin());
  end if;
end $$;

-- Rebuild default curve (1..100)
delete from public.leaderboard_rank_points;
insert into public.leaderboard_rank_points (rank, points)
select gs as rank,
       greatest(10, floor(1000 * power(0.92, gs - 1)))::int as points
from generate_series(1, 100) as gs;


-- Leaderboard RPC: aggregated stats since season start + rank-based points
create or replace function public.get_leaderboard(p_category text default 'points', p_limit int default 10)
returns table (
  id uuid,
  username text,
  avatar_url text,
  points int,
  books_read int,
  reviews_count int,
  followers_count int,
  rank int
)
language sql
stable
security definer
set search_path = public
as $$
with s as (
  select season_started_at
  from public.leaderboard_settings
  where id = 1
),
reviews as (
  select br.user_id,
         count(*)::int as reviews_count
  from public.book_reviews br, s
  where br.created_at >= s.season_started_at
  group by br.user_id
),
books as (
  select rh.user_id,
         count(*)::int as books_read
  from public.reading_history rh, s
  where rh.is_completed = true
    and coalesce(rh.completed_at, rh.updated_at, rh.created_at) >= s.season_started_at
  group by rh.user_id
),
followers as (
  select uf.following_id as user_id,
         count(*)::int as followers_count
  from public.user_followers uf, s
  where uf.created_at >= s.season_started_at
  group by uf.following_id
),
base as (
  select p.id,
         p.username,
         p.avatar_url,
         coalesce(b.books_read, 0) as books_read,
         coalesce(r.reviews_count, 0) as reviews_count,
         coalesce(f.followers_count, 0) as followers_count
  from public.profiles p
  left join books b on b.user_id = p.id
  left join reviews r on r.user_id = p.id
  left join followers f on f.user_id = p.id
  where (coalesce(b.books_read, 0) + coalesce(r.reviews_count, 0) + coalesce(f.followers_count, 0)) > 0
),
ranked as (
  select base.*,
    case
      when lower(p_category) = 'books' then row_number() over (order by books_read desc, reviews_count desc, followers_count desc, id)
      when lower(p_category) = 'reviews' then row_number() over (order by reviews_count desc, books_read desc, followers_count desc, id)
      when lower(p_category) = 'followers' then row_number() over (order by followers_count desc, books_read desc, reviews_count desc, id)
      else row_number() over (order by (books_read * 10 + reviews_count * 5 + followers_count * 2) desc, books_read desc, reviews_count desc, followers_count desc, id)
    end as rank
  from base
)
select ranked.id,
       ranked.username,
       ranked.avatar_url,
       coalesce(lrp.points, 0)::int as points,
       ranked.books_read,
       ranked.reviews_count,
       ranked.followers_count,
       ranked.rank
from ranked
left join public.leaderboard_rank_points lrp on lrp.rank = ranked.rank
order by ranked.rank
limit least(greatest(p_limit, 1), 100);
$$;

-- Allow calling the RPC from the client
grant execute on function public.get_leaderboard(text, int) to anon, authenticated;
