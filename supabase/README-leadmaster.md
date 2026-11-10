# LeadMaster on the NexGen Softwares cloud (Supabase nqqbduqqiwpaixmrweef)

Tables (tenant = customers.id, row level security on every table):
lm_profiles, lm_leads, lm_tasks, lm_settings, lm_products, lm_sends, lm_clients.
Helpers: lm_tenant(), lm_role(); RPCs: lm_manage_user(p jsonb), lm_report_version(v text).
Storage bucket `leadmaster-images` (public read; admin of a shop can write only inside `<tenant>/`).
A LeadMaster subscription creates the customer's admin profile (_provision_app); the super admin
opens LeadMaster as admin of the demo shop NGSDEMO (_ensure_demo_access).
Staff are created by the shop admin in LeadMaster → User Management and log in on the main link.

# Society Connect on the NexGen cloud
Tables: sc_docs (tenant, collection, id, data, v), sc_creds (resident/committee logins, bcrypt), sc_sessions, sc_login_fails – RLS on, no policies; the app uses only
sc_login / sc_login_session / sc_pull / sc_push / sc_logout / sc_public_settings. One society per customer; the customer is the main member (users doc `owner`).
Pricing: softwares.pricing_mode = 'per_flat' -> subscriptions.meta {flats, base, percent}; amount = flats x base x percent% (x12 yearly) in _quote.
Login: first_login_check / first_login_set (email + registered mobile -> own password), admin_allow_password_setup.
