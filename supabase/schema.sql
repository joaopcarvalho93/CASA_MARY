-- ============================================================
-- CASA MARY — Esquema Supabase (Postgres)
-- Correr no Supabase → SQL Editor → New query → colar → Run
-- ============================================================

-- Extensão para UUIDs
create extension if not exists "pgcrypto";

-- ---------- Pessoas ----------
create table if not exists people (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- ---------- Divisões ----------
create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort        int  default 0,
  created_at  timestamptz default now()
);

-- ---------- Itens da lista de compras ----------
create table if not exists items (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid references rooms(id) on delete set null,
  name          text not null,
  priority      text default 'Importante' check (priority in ('Essencial','Importante','Extra')),
  qty           int  default 1,
  notes         text,
  target_price  numeric(10,2),
  status        text default 'Por tratar' check (status in
                 ('Por tratar','Em pesquisa','Stand by','A comprar','Comprado — a chegar','Em casa','Excluído')),
  chosen_option_id uuid,             -- FK adicionada abaixo (evita dependência circular)
  responsavel   text,
  comment       text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ---------- Opções (sourcing) de cada item ----------
create table if not exists options (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid references items(id) on delete cascade,
  store       text,                  -- Loja / Onde
  kind        text default 'Novo' check (kind in ('Novo','2ª mão','Recondicionado')),
  link        text,
  price       numeric(10,2),
  dims        text,                  -- Dimensões / Detalhes
  status      text default 'A confirmar' check (status in
               ('A confirmar','Em análise','RECOMENDADO','Stand by','Excluído')),
  comment     text,
  responsavel text,
  created_at  timestamptz default now()
);

-- FK item -> opção escolhida (agora que options existe)
alter table items
  drop constraint if exists items_chosen_option_fk,
  add  constraint items_chosen_option_fk
       foreign key (chosen_option_id) references options(id) on delete set null;

-- ---------- Fotos (várias por opção) ----------
create table if not exists photos (
  id          uuid primary key default gen_random_uuid(),
  option_id   uuid references options(id) on delete cascade,
  url         text not null,
  created_at  timestamptz default now()
);

-- ---------- Inventário (o que já está em casa) ----------
create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid references rooms(id) on delete set null,
  name           text not null,
  category       text,
  qty            int default 1,
  notes          text,
  source_item_id uuid references items(id) on delete set null,  -- se veio de uma compra
  created_at     timestamptz default now()
);

-- ---------- Contratos da casa ----------
create table if not exists contracts (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,       -- Água, Eletricidade, Internet/TV, Seguro, Condomínio, Outro
  provider      text,                -- EPAL, EDP, WOO...
  plan_name     text,
  monthly_cost  numeric(10,2),
  account_ref   text,                -- nº cliente / CPE / contador
  start_date    date,
  notes         text,
  created_at    timestamptz default now()
);

-- ---------- Leituras mensais (água / luz) ----------
create table if not exists readings (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid references contracts(id) on delete set null,
  utility      text not null,        -- Água, Eletricidade
  reading_date date not null default current_date,
  value        numeric(12,2) not null,  -- m³ ou kWh (leitura do contador)
  cost         numeric(10,2),           -- valor faturado, se souberes
  notes        text,
  created_at   timestamptz default now()
);

-- ---------- Despesas (semana / mês) ----------
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  category     text,                 -- Mercearia, Casa, Contas, Lazer...
  description  text,
  amount       numeric(10,2) not null,
  spent_on     date not null default current_date,
  recurring    boolean default false,
  contract_id  uuid references contracts(id) on delete set null,
  paid_by      text,
  created_at   timestamptz default now()
);

-- ---------- Definições (uma linha) ----------
create table if not exists settings (
  id             int primary key default 1,
  budget_target  numeric(10,2) default 5000,
  home_label     text default 'Casa Mary — Ajuda, Lisboa',
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------- updated_at automático em items ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists items_updated_at on items;
create trigger items_updated_at before update on items
  for each row execute function set_updated_at();

-- ---------- Índices úteis ----------
create index if not exists idx_items_room    on items(room_id);
create index if not exists idx_items_status  on items(status);
create index if not exists idx_options_item  on options(item_id);
create index if not exists idx_photos_option on photos(option_id);
create index if not exists idx_readings_util on readings(utility, reading_date);
create index if not exists idx_expenses_date on expenses(spent_on);

-- ============================================================
-- RLS: app privada (2 pessoas). Autenticados fazem tudo.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['people','rooms','items','options','photos',
                           'inventory','contracts','readings','expenses','settings']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "auth_all" on %I;', t);
    execute format($p$create policy "auth_all" on %I
                     for all to authenticated using (true) with check (true);$p$, t);
  end loop;
end $$;

-- ============================================================
-- Seed inicial: divisões e pessoas (edita à vontade)
-- ============================================================
insert into rooms (name, sort) values
  ('Cozinha',1),('Sala',2),('Quarto',3),('WC',4),
  ('Limpeza & manutenção',5),('Despensa',6),('Marquise',7),('Extras',8)
on conflict do nothing;

insert into people (name) values ('João Carvalho'),('Mariana Machado')
on conflict do nothing;
