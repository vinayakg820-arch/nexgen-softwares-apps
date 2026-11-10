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

# Mauli Coaching Classes on the NexGen cloud
Server: edge function `mauli-coaching` (supabase/functions/mauli-coaching/index.ts, verify_jwt off – it checks its own sessions).
Tables (RLS on, no policies – only the function with the service key reads them): mc_docs (students, requests, batches, leaves,
reports, events, materials), mc_settings (class settings + change counter v), mc_teachers (globally unique login, bcrypt),
mc_stu_acc (per phone), mc_sessions, mc_activity, mc_push (web push), mc_login_fails. Files: private bucket coaching-materials.
Logins: admin = NexGen Email ID (or ng_login with the main-link session; super admin -> NGSDEMO), teacher = Login ID,
student = mobile number (+ class choice when one number is in two classes). A Coaching subscription provisions mc_settings.
