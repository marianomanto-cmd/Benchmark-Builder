<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Documentation discipline (MANDATORY)

Keep the documentation in sync with the code at all times. Whenever you make a
change, update the docs **in the same change/commit**, before pushing:

- `docs/STATUS.md` is the single source of truth for project state — update its
  data model, pipeline, screens, env vars, and "Hecho vs pendiente" sections
  whenever they change, and bump the "Última actualización" date.
- When you add/alter DB schema, write the migration file under
  `supabase/migrations/` AND reflect it in `docs/STATUS.md` §4.
- When you add env vars, update `.env.example` AND `docs/STATUS.md` §8.
- A task is not "done" until its docs are updated. No undocumented changes.
