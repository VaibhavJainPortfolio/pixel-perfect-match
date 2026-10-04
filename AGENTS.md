<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live only in `user_roles`; RLS uses `has_role`/`is_admin`/`is_staff` security-definer functions — prevents privilege escalation.
- Signed-in pages live under `src/routes/_authenticated/`; admin pages under `_authenticated/admin*` gated by a staff-role check in `admin.tsx` — one gate per area.
- Storage buckets are private; object paths start with the owner's user id so folder-based RLS works; read via signed URLs only.
- Shared UI primitives live in `src/components/gent/`; colors come only from tokens in `src/styles.css` (dark on :root, `.light` override).
