-- Chạy toàn bộ file này trong Supabase > SQL Editor
create table games (id text primary key, name text not null, emoji text not null);
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  coins int not null default 100 check (coins >= 0),
  created_at timestamptz default now()
);
create table scores (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  game_id text not null references games(id),
  score int not null, won boolean not null default false,
  created_at timestamptz default now()
);
create index on scores (game_id, score desc);
create table pets (
  id serial primary key, name text not null, emoji text not null,
  rarity text not null check (rarity in ('common','rare','epic','legendary','mythic','secret')),
  perk text not null, perk_value int not null default 0
);
create table user_pets (
  user_id uuid references profiles(id) on delete cascade,
  pet_id int references pets(id), primary key (user_id, pet_id)
);
create table daily_quests (
  id serial primary key, code text unique not null, title text not null,
  goal int not null, reward int not null
);
create table user_quests (
  user_id uuid references profiles(id) on delete cascade,
  quest_id int references daily_quests(id),
  day date not null default current_date,
  progress int not null default 0, claimed boolean not null default false,
  primary key (user_id, quest_id, day)
);

-- Bảo mật: chỉ cho ĐỌC; mọi thay đổi xu/điểm đi qua hàm RPC bên dưới
alter table games enable row level security;
alter table profiles enable row level security;
alter table scores enable row level security;
alter table pets enable row level security;
alter table user_pets enable row level security;
alter table daily_quests enable row level security;
alter table user_quests enable row level security;
create policy "read" on games for select using (true);
create policy "read" on profiles for select using (true);
create policy "read" on scores for select using (true);
create policy "read" on pets for select using (true);
create policy "read" on daily_quests for select using (true);
create policy "own" on user_pets for select using (auth.uid() = user_id);
create policy "own" on user_quests for select using (auth.uid() = user_id);

-- Tự tạo hồ sơ khi đăng ký
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username) values (new.id, new.raw_user_meta_data->>'username');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create function bump_quest(p_code text, p_amt int) returns void language sql security definer set search_path = public as $$
  insert into user_quests (user_id, quest_id, progress)
  select auth.uid(), id, p_amt from daily_quests where code = p_code
  on conflict (user_id, quest_id, day) do update set progress = user_quests.progress + p_amt;
$$;

create function submit_score(p_game text, p_score int, p_won boolean) returns int
language plpgsql security definer set search_path = public as $$
declare bonus int; earned int;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  p_score := greatest(0, least(p_score, 1000000));
  insert into scores (user_id, game_id, score, won) values (auth.uid(), p_game, p_score, p_won);
  select coalesce(max(p.perk_value), 0) into bonus from user_pets up
    join pets p on p.id = up.pet_id where up.user_id = auth.uid() and p.perk = 'coin_bonus';
  earned := ((least(p_score / 10, 50) + 5) * (100 + bonus)) / 100;
  update profiles set coins = coins + earned where id = auth.uid();
  perform bump_quest('play3', 1);
  if p_won then perform bump_quest('win1', 1); end if;
  return earned;
end $$;

create function claim_quest(p_quest int) returns int
language plpgsql security definer set search_path = public as $$
declare r int;
begin
  update user_quests uq set claimed = true from daily_quests q
   where uq.quest_id = q.id and q.id = p_quest and uq.user_id = auth.uid()
     and uq.day = current_date and not uq.claimed and uq.progress >= q.goal
  returning q.reward into r;
  if r is null then raise exception 'chưa đủ điều kiện'; end if;
  update profiles set coins = coins + r where id = auth.uid();
  return r;
end $$;

create function gacha_roll() returns pets
language plpgsql security definer set search_path = public as $$
declare roll numeric := random() * 100; rar text; got pets;
begin
  update profiles set coins = coins - 100 where id = auth.uid(); -- lỗi nếu < 100 xu
  rar := case when roll < 60 then 'common' when roll < 85 then 'rare'
    when roll < 95 then 'epic' when roll < 99 then 'legendary'
    when roll < 99.9 then 'mythic' else 'secret' end;
  select * into got from pets where rarity = rar order by random() limit 1;
  insert into user_pets values (auth.uid(), got.id) on conflict do nothing;
  perform bump_quest('gacha1', 1);
  return got;
end $$;

grant execute on function submit_score, claim_quest, gacha_roll to authenticated;
revoke execute on function bump_quest from public, anon, authenticated;

insert into games values
 ('pikachu','Pikachu Cổ Điển','🐭'),('minesweeper','Dò Mìn','💣'),
 ('chess','Cờ Vua & Cờ Tướng','♟️'),('oanquan','Ô Ăn Quan','🪨'),
 ('flappy','Flappy Bird','🐤'),('mario','Mini Platformer','🍄'),
 ('fps','Bắn Súng Ngộ Nghĩnh','🎯');
insert into pets (name, emoji, rarity, perk, perk_value) values
 ('Mèo Bông','🐱','common','coin_bonus',5),('Chó Mochi','🐶','common','coin_bonus',5),
 ('Thỏ Kẹo','🐰','rare','coin_bonus',10),('Cáo Lửa','🦊','rare','coin_bonus',10),
 ('Gấu Mật','🐻','epic','coin_bonus',20),('Kỳ Lân Mây','🦄','legendary','coin_bonus',35),
 ('Rồng Sao','🐉','mythic','coin_bonus',60),('Bóng Ma Cầu Vồng','👻','secret','coin_bonus',100);
insert into daily_quests (code, title, goal, reward) values
 ('play3','Chơi 3 ván game bất kỳ',3,30),('win1','Thắng 1 trận',1,40),('gacha1','Quay gacha 1 lần',1,25);
