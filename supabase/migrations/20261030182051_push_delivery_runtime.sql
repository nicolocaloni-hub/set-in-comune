begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select cron.schedule('set-in-comune-push-retry', '* * * * *', 'select private.dispatch_due_push();');
commit;
