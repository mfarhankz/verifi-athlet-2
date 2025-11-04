-- Enable RLS on athlete_track table
alter table public.athlete_track enable row level security;

-- RLS policy for athlete_track (read-only for users with customer_package 1, 97, 98, 104)
create policy "Enable read access for athlete_track based on customer_package"
on public.athlete_track for select using (
  exists (
    select 1
    from public.user_package_access upa
    where upa.user_id = auth.uid()
    and upa.customer_package_id in (1, 97, 98, 104)
  )
);

-- Enable RLS on camp_attendance table
alter table public.camp_attendance enable row level security;

-- RLS policy for camp_attendance (read-only for users with customer_package 1, 102)
create policy "Enable read access for camp_attendance based on customer_package"
on public.camp_attendance for select using (
  exists (
    select 1
    from public.user_package_access upa
    where upa.user_id = auth.uid()
    and upa.customer_package_id in (1, 102)
  )
);

-- Enable RLS on camp_event table
alter table public.camp_event enable row level security;

-- RLS policy for camp_event (read-only for users with customer_package 1, 102)
create policy "Enable read access for camp_event based on customer_package"
on public.camp_event for select using (
  exists (
    select 1
    from public.user_package_access upa
    where upa.user_id = auth.uid()
    and upa.customer_package_id in (1, 102)
  )
);

-- Enable RLS on camp_result table
alter table public.camp_result enable row level security;

-- RLS policy for camp_result (read-only for users with customer_package 1, 102)
create policy "Enable read access for camp_result based on customer_package"
on public.camp_result for select using (
  exists (
    select 1
    from public.user_package_access upa
    where upa.user_id = auth.uid()
    and upa.customer_package_id in (1, 102)
  )
);

