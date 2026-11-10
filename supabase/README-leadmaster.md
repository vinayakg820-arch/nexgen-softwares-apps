# LeadMaster on the NexGen Softwares cloud (Supabase nqqbduqqiwpaixmrweef)

Tables (tenant = customers.id, row level security on every table):
lm_profiles, lm_leads, lm_tasks, lm_settings, lm_products, lm_sends, lm_clients.
Helpers: lm_tenant(), lm_role(); RPCs: lm_manage_user(p jsonb), lm_report_version(v text).
Storage bucket `leadmaster-images` (public read; admin of a shop can write only inside `<tenant>/`).
A LeadMaster subscription creates the customer's admin profile (_provision_app); the super admin
opens LeadMaster as admin of the demo shop NGSDEMO (_ensure_demo_access).
Staff are created by the shop admin in LeadMaster → User Management and log in on the main link.
