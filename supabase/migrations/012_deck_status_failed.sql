-- Add failed status for deck generation/refresh errors

do $$ begin
  alter type public.deck_status add value 'failed';
exception
  when duplicate_object then null;
end $$;
