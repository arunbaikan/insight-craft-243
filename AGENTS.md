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

- Keep the PDF export dependency's DOMPurify resolution at a patched version (at least 3.4.17) because earlier versions allow template-sanitization bypasses.

- Keep imported financial calculations in `src/lib/fincommand` and use the newer source engine rather than the legacy demo engine, preserving tested report behavior.
- Namespace imported financial tables with `fincommand_` and enforce server-controlled company memberships, avoiding collisions with the existing dashboard schema.
- Use request-scoped RLS clients with bearer forwarding for imported data; never cache a session-bearing client across users or grant anonymous financial-data access.
