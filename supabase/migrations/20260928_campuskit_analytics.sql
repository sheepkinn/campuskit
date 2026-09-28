-- Anonymous usage events only. Files, filenames, IP addresses and page contents are not stored.
create table if not exists public.campuskit_events (
  event_id uuid primary key,
  session_id uuid not null,
  visitor_id uuid not null,
  event_type text not null check (event_type in ('visit', 'tool_complete')),
  tool text,
  occurred_at timestamptz not null default now(),
  constraint campuskit_event_shape check (
    (event_type = 'visit' and tool is null)
    or (event_type = 'tool_complete' and tool in (
      'practice', 'word', 'compress', 'rename', 'convert',
      'pdf-merge', 'pdf-split', 'gif-edit', 'video-gif'
    ))
  )
);

create unique index if not exists campuskit_one_visit_per_session
  on public.campuskit_events (session_id) where event_type = 'visit';
create index if not exists campuskit_events_time on public.campuskit_events (occurred_at);
create index if not exists campuskit_events_session on public.campuskit_events (session_id, event_type);

alter table public.campuskit_events enable row level security;
revoke all on public.campuskit_events from anon, authenticated;

create or replace function public.campuskit_record_event(
  p_event_id uuid,
  p_session_id uuid,
  p_visitor_id uuid,
  p_event_type text,
  p_tool text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_type not in ('visit', 'tool_complete') then
    return false;
  end if;
  if p_event_type = 'visit' and p_tool is not null then
    return false;
  end if;
  if p_event_type = 'tool_complete' then
    if p_tool not in ('practice', 'word', 'compress', 'rename', 'convert',
      'pdf-merge', 'pdf-split', 'gif-edit', 'video-gif') then
      return false;
    end if;
    if not exists (
      select 1 from public.campuskit_events
      where session_id = p_session_id and visitor_id = p_visitor_id
        and event_type = 'visit' and occurred_at > now() - interval '1 day'
    ) then
      return false;
    end if;
  end if;
  insert into public.campuskit_events (event_id, session_id, visitor_id, event_type, tool)
  values (p_event_id, p_session_id, p_visitor_id, p_event_type, p_tool)
  on conflict do nothing;
  return true;
end;
$$;

create or replace function public.campuskit_stats(p_days integer default 14)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with visits as (
    select session_id, visitor_id, occurred_at from public.campuskit_events
    where event_type = 'visit'
  ), completed as (
    select session_id, visitor_id, tool from public.campuskit_events
    where event_type = 'tool_complete'
  )
  select jsonb_build_object(
    'today', (select count(*) from visits
      where timezone('Asia/Shanghai', occurred_at)::date = timezone('Asia/Shanghai', now())::date),
    'total', (select count(*) from visits),
    'toolVisitors', (select count(distinct visitor_id) from completed),
    'browseOnly', (select count(*) from visits v
      where v.occurred_at < now() - interval '5 minutes'
        and not exists (select 1 from completed c where c.session_id = v.session_id)),
    'uses', (select count(*) from completed),
    'dailyVisits', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'count', d.count) order by d.day), '[]'::jsonb)
      from (
        select (timezone('Asia/Shanghai', now())::date - n) as day,
          (select count(*) from visits v where timezone('Asia/Shanghai', v.occurred_at)::date =
            timezone('Asia/Shanghai', now())::date - n) as count
        from generate_series(0, case when p_days in (7, 14, 30) then p_days else 14 end - 1) as g(n)
      ) d
    ),
    'toolUsage', (
      select coalesce(jsonb_agg(jsonb_build_object('tool', t.tool, 'count', t.count) order by t.count desc), '[]'::jsonb)
      from (select tool, count(*) as count from completed group by tool) t
    )
  );
$$;

revoke execute on function public.campuskit_record_event(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.campuskit_stats(integer) from public, anon, authenticated;
grant execute on function public.campuskit_record_event(uuid, uuid, uuid, text, text) to anon;
grant execute on function public.campuskit_stats(integer) to anon;
