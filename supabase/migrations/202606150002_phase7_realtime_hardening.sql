alter table user_notifications replica identity full;
alter table background_jobs replica identity full;
alter table activity_events replica identity full;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['user_notifications', 'background_jobs', 'activity_events'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
