# Setup Supabase Authentication

Set up production-ready Supabase authentication for a project using CLI-first workflow.

## Overview

This command:

1. Detects project framework (Next.js, SvelteKit, Vue, etc.)
2. Checks Supabase CLI installation and project status
3. Creates database migrations for auth tables
4. Generates TypeScript types
5. Implements framework-specific auth components
6. Sets up protected routes and middleware
7. Verifies security checklist

## Command Usage

```
/mm:setup-auth [options]
```

**Options:**

- `--flow <type>` - Auth flow: `email`, `oauth`, `magic-link`, or `all` (default: `email`)
- `--providers <list>` - OAuth providers: `google,github,discord` (comma-separated)
- `--skip-migration` - Skip database migration (if already set up)

**Examples:**

```
/mm:setup-auth
/mm:setup-auth --flow oauth --providers google,github
/mm:setup-auth --flow all --providers google
```

## Step 1: Environment Check

### 1.1 Detect Framework

Check for framework indicators in the project root:

```bash
# Check for framework config files
ls -la | grep -E "(next|svelte|nuxt|vite).config"
```

**Framework detection:**

- `next.config.js` or `next.config.ts` → **Next.js**
- `svelte.config.js` → **SvelteKit**
- `nuxt.config.ts` → **Nuxt 3**
- `vite.config.ts` + Vue in package.json → **Vue 3 + Vite**

Read `package.json` to confirm:

```json
{
  "dependencies": {
    "next": "..." // Next.js
    "@sveltejs/kit": "..." // SvelteKit
    "nuxt": "..." // Nuxt
    "vue": "..." // Vue
  }
}
```

**Store detected framework for later steps.**

### 1.2 Check Supabase CLI

```bash
supabase --version
```

**If not installed, inform user:**

```
Supabase CLI not found. Install with:

  # macOS
  brew install supabase/tap/supabase

  # npm (alternative)
  npm install -g supabase

Then run this command again.
```

### 1.3 Check Supabase Project Status

```bash
supabase status
```

**If not initialized:**

```
Supabase not initialized in this project. Would you like to:

1. Initialize new local project: `supabase init`
2. Link to existing remote project: `supabase link --project-ref <ref>`

Please run the appropriate command and try again.
```

### 1.4 Check Existing Auth Setup

Look for existing auth implementation:

- `supabase/migrations/*auth*` or `*profile*`
- Auth-related components in `src/` or `app/`
- Environment variables with `SUPABASE` in name

**If found, warn:**

```
Existing auth setup detected:
- Migration: supabase/migrations/20241201_auth_profiles.sql
- Components: src/components/auth/LoginForm.tsx

Options:
1. Continue and overwrite (backup recommended)
2. Skip migration, only add missing components
3. Cancel

Choose option:
```

## Step 2: Database Migration

**Reference:** `.claude/agents/supabase-auth/knowledge/cli-workflow.md`

### 2.1 Create Migration

```bash
supabase migration new setup_auth_profiles
```

### 2.2 Write Migration SQL

Create the migration file with this content:

```sql
-- Setup auth profiles table with RLS

-- Create profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Updated timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2.3 Apply Migration

```bash
# For local development
supabase db reset

# For remote (if linked)
supabase db push
```

## Step 3: Generate Types

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

Or for remote:

```bash
supabase gen types typescript --project-id <ref> > src/types/database.types.ts
```

## Step 4: Environment Variables

### 4.1 Create .env.example

Based on detected framework:

**Next.js:**

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**SvelteKit:**

```env
PUBLIC_SUPABASE_URL=your-project-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Vue/Vite:**

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4.2 Check .gitignore

Ensure `.env.local` and `.env` are in `.gitignore`.

### 4.3 Get Values from Supabase

```bash
supabase status
```

Output contains the keys. For remote projects, get from Supabase Dashboard → Settings → API.

## Step 5: Framework Implementation

Based on detected framework, implement auth using the corresponding knowledge file:

### Next.js

**Reference:** `.claude/agents/supabase-auth/knowledge/frameworks/nextjs.md`

Create:

1. `src/lib/supabase/client.ts` - Browser client
2. `src/lib/supabase/server.ts` - Server client
3. `src/lib/supabase/admin.ts` - Admin client (optional)
4. `src/middleware.ts` - Session refresh + route protection
5. `src/app/auth/callback/route.ts` - Auth callback handler

### SvelteKit

**Reference:** `.claude/agents/supabase-auth/knowledge/frameworks/sveltekit.md`

Create:

1. `src/lib/supabase/client.ts` - Browser client
2. `src/lib/supabase/server.ts` - Server client
3. `src/hooks.server.ts` - Session handling
4. `src/app.d.ts` - Type definitions
5. `src/routes/auth/callback/+server.ts` - Auth callback

### Vue 3 / Nuxt

**Reference:** `.claude/agents/supabase-auth/knowledge/frameworks/vue.md`

Create:

1. `src/lib/supabase.ts` - Supabase client
2. `src/stores/auth.ts` - Pinia auth store
3. `src/router/index.ts` - Router guards
4. For Nuxt: configure `@nuxtjs/supabase` module

## Step 6: Auth Flow Components

Based on `--flow` option, create components using:

### Email/Password (`--flow email`)

**Reference:** `.claude/agents/supabase-auth/knowledge/flows/email-password.md`

Create:

- Login form component
- Sign up form component
- Password reset flow
- Sign out button

### OAuth (`--flow oauth`)

**Reference:** `.claude/agents/supabase-auth/knowledge/flows/oauth.md`

Create:

- Social login buttons
- OAuth callback handling
- Provider configuration instructions

### Magic Link (`--flow magic-link`)

**Reference:** `.claude/agents/supabase-auth/knowledge/flows/magic-link.md`

Create:

- Magic link request form
- OTP verification (optional)
- Callback handling

### All Flows (`--flow all`)

Create combined auth form with tabs/options for all methods.

## Step 7: Protected Routes

Create route protection based on framework:

**Next.js:** Middleware-based protection
**SvelteKit:** Layout server load protection
**Vue:** Router navigation guards

## Step 8: Security Checklist

**Reference:** `.claude/agents/supabase-auth/knowledge/rls-policies.md`

Verify and report on:

```markdown
## Security Checklist

### Cookie Settings

- [ ] httpOnly: true (SSR frameworks)
- [ ] secure: true (production)
- [ ] sameSite: 'lax' minimum

### RLS Policies

- [ ] profiles table has RLS enabled
- [ ] Policies use auth.uid()
- [ ] No overly permissive policies

### Token Handling

- [ ] Access tokens not in localStorage (for sensitive apps)
- [ ] Refresh handled by SDK

### Protected Routes

- [ ] Middleware/guards configured
- [ ] Unauthenticated users redirected

### Environment Variables

- [ ] SUPABASE_URL set
- [ ] SUPABASE_ANON_KEY set
- [ ] SERVICE_ROLE_KEY server-only
- [ ] .env in .gitignore
```

## Step 9: Summary

Display implementation summary:

````markdown
## Auth Setup Complete

**Framework:** Next.js (App Router)
**Auth Flows:** Email/Password, Google OAuth

### Files Created

- src/lib/supabase/client.ts
- src/lib/supabase/server.ts
- src/middleware.ts
- src/app/auth/callback/route.ts
- src/components/auth/LoginForm.tsx
- src/components/auth/SignUpForm.tsx
- src/components/auth/SignOutButton.tsx
- supabase/migrations/20241214_setup_auth_profiles.sql
- src/types/database.types.ts

### Environment Variables

Add to .env.local:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### Next Steps

1. Run `supabase start` for local development
2. Copy environment values from `supabase status`
3. Configure OAuth providers in Supabase Dashboard (if using OAuth)
4. Test sign up → confirm email → sign in flow

### Testing Commands

```bash
# Start local Supabase
supabase start

# Run your app
npm run dev

# Test endpoints
# - /login - Sign in page
# - /signup - Registration page
# - /dashboard - Protected page (redirects if not authenticated)
```
````

```

## Error Handling

- **Supabase CLI not found:** Provide installation instructions
- **Project not initialized:** Guide through `supabase init` or `supabase link`
- **Framework not detected:** Ask user to specify or check package.json
- **Migration conflicts:** Offer to skip or backup existing
- **Missing dependencies:** Run `npm install @supabase/supabase-js @supabase/ssr`

## Notes for Claude

When executing this command:

1. **Always read the knowledge files** before generating code
2. **Use exact patterns** from the framework-specific guides
3. **Don't skip the migration** unless user explicitly requests
4. **Generate types** after migration
5. **Verify security checklist** items are addressed
6. **Provide copy-paste ready** environment variable templates

---

**Version:** 1.0
**Agent:** supabase-auth
**Status:** Ready for use
```
