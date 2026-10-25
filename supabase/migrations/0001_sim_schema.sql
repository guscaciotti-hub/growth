-- Simulador de viabilidade de negócios (namespace sim_)
-- Acesso só via funções sim_* (security definer) validadas por owner_token.
create extension if not exists pgcrypto;

create table if not exists public.sim_projects (
  id uuid primary key default gen_random_uuid(),
  owner_token uuid not null,
  name text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sim_projects_owner_idx on public.sim_projects(owner_token, created_at desc);

create table if not exists public.sim_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sim_projects(id) on delete cascade,
  data jsonb not null,
  research text,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists sim_analyses_project_idx on public.sim_analyses(project_id, created_at desc);

create table if not exists public.sim_personas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sim_projects(id) on delete cascade,
  idx int not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, idx)
);

create table if not exists public.sim_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sim_projects(id) on delete cascade,
  label text not null default 'Cenário base',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'running',
  summary jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists sim_runs_project_idx on public.sim_runs(project_id, created_at desc);

create table if not exists public.sim_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sim_runs(id) on delete cascade,
  persona_idx int not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, persona_idx)
);

alter table public.sim_projects enable row level security;
alter table public.sim_analyses enable row level security;
alter table public.sim_personas enable row level security;
alter table public.sim_runs enable row level security;
alter table public.sim_results enable row level security;

create or replace function public.sim_assert_owner(p_token uuid, p_project uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or not exists (select 1 from sim_projects where id = p_project and owner_token = p_token) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end $$;

create or replace function public.sim_create_project(p_token uuid, p_name text, p_input jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_token is null then raise exception 'token_required'; end if;
  insert into sim_projects(owner_token, name, input) values (p_token, left(coalesce(p_name,'Novo negócio'),120), coalesce(p_input,'{}'::jsonb)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.sim_list_projects(p_token uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'status', p.status, 'input', p.input,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'score', (select (a.data->'verdict'->>'success_score')::numeric from sim_analyses a where a.project_id = p.id order by a.created_at desc limit 1),
    'runs', (select count(*) from sim_runs r where r.project_id = p.id)
  ) order by p.updated_at desc), '[]'::jsonb)
  from sim_projects p where p.owner_token = p_token;
$$;

create or replace function public.sim_get_project(p_token uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v jsonb;
begin
  perform sim_assert_owner(p_token, p_id);
  select jsonb_build_object(
    'project', jsonb_build_object('id', p.id, 'name', p.name, 'status', p.status, 'input', p.input, 'created_at', p.created_at, 'updated_at', p.updated_at),
    'analysis', (select jsonb_build_object('id', a.id, 'data', a.data, 'research', a.research, 'model', a.model, 'created_at', a.created_at)
                 from sim_analyses a where a.project_id = p.id order by a.created_at desc limit 1),
    'personas', (select coalesce(jsonb_agg(ps.data order by ps.idx), '[]'::jsonb) from sim_personas ps where ps.project_id = p.id),
    'runs', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', r.id, 'label', r.label, 'config', r.config, 'status', r.status, 'summary', r.summary,
                'created_at', r.created_at, 'finished_at', r.finished_at,
                'results', (select coalesce(jsonb_agg(res.data order by res.persona_idx), '[]'::jsonb) from sim_results res where res.run_id = r.id)
             ) order by r.created_at asc), '[]'::jsonb) from sim_runs r where r.project_id = p.id)
  ) into v from sim_projects p where p.id = p_id;
  return v;
end $$;

create or replace function public.sim_update_project(p_token uuid, p_id uuid, p_status text, p_input jsonb, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform sim_assert_owner(p_token, p_id);
  update sim_projects set
    status = coalesce(p_status, status),
    input = coalesce(p_input, input),
    name = coalesce(left(p_name,120), name),
    updated_at = now()
  where id = p_id;
end $$;

create or replace function public.sim_delete_project(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform sim_assert_owner(p_token, p_id);
  delete from sim_projects where id = p_id;
end $$;

create or replace function public.sim_save_analysis(p_token uuid, p_project_id uuid, p_data jsonb, p_research text, p_model text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform sim_assert_owner(p_token, p_project_id);
  insert into sim_analyses(project_id, data, research, model) values (p_project_id, p_data, p_research, p_model) returning id into v_id;
  update sim_projects set status = 'analyzed', updated_at = now() where id = p_project_id;
  return v_id;
end $$;

create or replace function public.sim_save_personas(p_token uuid, p_project_id uuid, p_personas jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform sim_assert_owner(p_token, p_project_id);
  delete from sim_personas where project_id = p_project_id;
  insert into sim_personas(project_id, idx, data)
    select p_project_id, (e->>'idx')::int, e from jsonb_array_elements(p_personas) e;
  get diagnostics n = row_count;
  update sim_projects set status = 'personas', updated_at = now() where id = p_project_id;
  return n;
end $$;

create or replace function public.sim_create_run(p_token uuid, p_project_id uuid, p_label text, p_config jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform sim_assert_owner(p_token, p_project_id);
  insert into sim_runs(project_id, label, config) values (p_project_id, left(coalesce(p_label,'Cenário'),120), coalesce(p_config,'{}'::jsonb)) returning id into v_id;
  update sim_projects set status = 'simulating', updated_at = now() where id = p_project_id;
  return v_id;
end $$;

create or replace function public.sim_save_results(p_token uuid, p_run_id uuid, p_results jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_project uuid; n int;
begin
  select project_id into v_project from sim_runs where id = p_run_id;
  perform sim_assert_owner(p_token, v_project);
  insert into sim_results(run_id, persona_idx, data)
    select p_run_id, (e->>'persona_idx')::int, e from jsonb_array_elements(p_results) e
  on conflict (run_id, persona_idx) do update set data = excluded.data;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.sim_finish_run(p_token uuid, p_run_id uuid, p_summary jsonb, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_project uuid;
begin
  select project_id into v_project from sim_runs where id = p_run_id;
  perform sim_assert_owner(p_token, v_project);
  update sim_runs set summary = coalesce(p_summary, summary), status = coalesce(p_status,'done'), finished_at = now() where id = p_run_id;
  update sim_projects set status = case when coalesce(p_status,'done') = 'done' then 'simulated' else status end, updated_at = now() where id = v_project;
end $$;

revoke all on function public.sim_assert_owner(uuid, uuid) from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array[
    'sim_create_project(uuid,text,jsonb)', 'sim_list_projects(uuid)', 'sim_get_project(uuid,uuid)',
    'sim_update_project(uuid,uuid,text,jsonb,text)', 'sim_delete_project(uuid,uuid)',
    'sim_save_analysis(uuid,uuid,jsonb,text,text)', 'sim_save_personas(uuid,uuid,jsonb)',
    'sim_create_run(uuid,uuid,text,jsonb)', 'sim_save_results(uuid,uuid,jsonb)', 'sim_finish_run(uuid,uuid,jsonb,text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated, service_role', f);
  end loop;
end $$;
