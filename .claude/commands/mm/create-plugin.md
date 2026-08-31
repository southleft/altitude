# Create Plugin (Monday Morning)

## What This Command Does

Creates a new Monday Morning plugin with the correct structure, types, and manifest integration. Plugins extend MM with integrations, tools, and UI contributions.

## Usage

```
/mm:create-plugin <plugin-slug>
```

**Examples:**

- `/mm:create-plugin linear` — Create a Linear integration plugin
- `/mm:create-plugin jira` — Create a Jira integration plugin
- `/mm:create-plugin time-doctor` — Create a Time Doctor integration plugin

---

## Step 1: Gather Requirements

Ask the user these questions (skip any they've already answered):

1. **What does this plugin do?** (1-sentence description)
2. **Category?** — `integration` (connects to external service), `migration` (imports data), or `export` (exports data)
3. **UI Category?** — `communications`, `development`, `project-management`, `financial`, `data-storage`, or `export-reporting`
4. **Authentication** — What credentials does it need? (API keys, tokens, OAuth) List each with:
   - Key name (e.g., `api_token`)
   - Label (e.g., "API Token")
   - Type: `text` or `password`
   - Help URL (where to get the credential)
5. **Global config** — Any app-wide settings? (e.g., server URL, default preferences)
6. **Per-project config** — Any settings that differ per project? (e.g., board ID, project ID, channel)
7. **MCP tools** — Does it provide any Claude-callable tools? If so, list them with names and descriptions
8. **UI contributions** — Does it need any of these?
   - **Template slots**: Inject into existing views (card badges, column headers, dashboard widgets)
   - **Sidebar pages**: Its own page in the sidebar (needs a pre-registered Svelte component)
   - **Actions**: Command palette or context menu items

---

## Step 2: Create Plugin File

Create `mcp-servers/monday-morning/plugins/<plugin-slug>/index.ts` following this exact structure:

```typescript
import type {
  MondayMorningPlugin,
  PluginContext,
} from "../../src/plugin-types.js";

let pluginContext: PluginContext | undefined;

const <camelCaseId>Plugin: MondayMorningPlugin = {
  id: "<plugin-slug>",
  name: "<Human Readable Name>",
  description: "<1-sentence description>",
  version: "1.0.0",
  category: "<category>",
  tier: "free",

  uiCategory: "<ui-category>" as const,

  // UI CONTRIBUTIONS (only include sections that apply)
  ui: {
    icon: "<emoji>",
    tagline: "<short tagline for settings listings>",
    // Include only the arrays that apply:
    // slots: [...],
    // sidebarItems: [...],
    // widgets: [...],
    // actions: [...],
  },

  // SETTINGS SCHEMA (only include sections that apply)
  settings: {
    // credentials: [...],
    // config: [...],
    // projectConfig: [...],
  },

  // MCP TOOLS (empty array if none)
  tools: [],

  register: async (context: PluginContext): Promise<void> => {
    pluginContext = context;
    context.logger.info("<Name> plugin registered");
  },
};

export default <camelCaseId>Plugin;

export function getPluginContext(): PluginContext | undefined {
  return pluginContext;
}
```

### Critical Rules

- **`id`** must match the folder name (kebab-case)
- **`category`** must be exactly `"integration"`, `"migration"`, or `"export"`
- **`uiCategory`** must use `as const` assertion
- **All type literals** in settings must use `as const` (e.g., `type: "password" as const`)
- **`tools`** must be an array (empty `[]` if no tools)
- **`register`** must be an async function

### Settings Schema Reference

**Credentials** (stored in OS keychain):

```typescript
credentials: [
  {
    key: 'api_token',
    label: 'API Token',
    type: 'password' as const,
    required: true,
    helpUrl: 'https://...',
    helpText: 'Instructions to get the token',
    scopes: ['read', 'write'] // optional
  }
];
```

**Global config** (stored in ~/.monday-morning/plugins/{id}/config.json):

```typescript
config: [
  {
    key: 'server_url',
    label: 'Server URL',
    type: 'text' as const,
    description: 'Custom server endpoint',
    placeholder: 'https://api.example.com'
  }
];
```

**Per-project config** (stored in .mm/plugins/{id}/config.json):

```typescript
projectConfig: [
  {
    key: 'project_id',
    label: 'Project ID',
    type: 'text' as const,
    description: 'External project to link',
    placeholder: 'PRJ-123'
  },
  {
    key: 'board_id',
    label: 'Board',
    type: 'board-picker' as const, // special picker type
    description: 'Select board to sync',
    fetchCommand: 'search_boards' // Tauri command
  },
  {
    key: 'sync_direction',
    label: 'Sync Direction',
    type: 'select' as const,
    options: [
      { label: 'Both', value: 'both' },
      { label: 'Pull only', value: 'pull' }
    ],
    default: 'both'
  },
  {
    key: 'enabled',
    label: 'Auto-sync',
    type: 'boolean' as const,
    default: false
  },
  {
    key: 'channel',
    label: 'Channel',
    type: 'channel' as const,
    dependsOn: 'enabled' // only visible when enabled=true
  }
];
```

### UI Registration Reference

**Template Slots** (inject into existing views):

```typescript
slots: [
  {
    slot: 'card.badge' as const,
    content: {
      type: 'icon-badge' as const,
      icon: 'service-name',
      tooltip: 'Synced'
    },
    requiresAuth: true,
    dataSource: { command: 'get_sync_status' }
  }
];
```

Available slots: `card.badge`, `card.context-menu`, `column.header`, `dashboard.summary`, `dashboard.sidebar`, `entity.toolbar`

**Sidebar Pages** (own page):

```typescript
sidebarItems: [
  {
    id: 'my-view',
    label: 'My View',
    icon: '🔧',
    viewType: 'custom' as const,
    componentName: 'MyCustomView', // must be registered in pluginComponents.ts
    requiresAuth: true
  }
];
```

**Actions** (command palette / context menus):

```typescript
actions: [
  {
    id: 'plugin-action',
    label: 'Do Something',
    context: 'command-palette' as const,
    command: 'tauri_command_name'
  }
];
```

---

## Step 3: Add MCP Tools (if applicable)

If the plugin provides MCP tools, define Zod input schemas and handlers:

```typescript
import { z } from "zod";

const MyToolInputSchema = z.object({
  project_path: z.string().describe("Absolute path to the project root"),
  // ... other params
});

// Add to tools array:
tools: [
  {
    name: "mm_<plugin>_<action>",      // always prefix with mm_
    description: "What this tool does",
    inputSchema: MyToolInputSchema,
    handler: async (args: unknown) => {
      const input = MyToolInputSchema.parse(args);
      // ... implementation
      return { success: true, data: ... };
    },
  },
],
```

---

## Step 4: Build the Plugin

Plugins must be compiled to JS before the MCP server can load them:

```bash
cd mcp-servers/monday-morning && npm run build
```

This compiles all source (including plugins) to `dist/`. The server runs from `dist/plugins/`, so a full build is required — compiling in-place inside `plugins/` is not sufficient.

---

## Step 5: Register Sidebar Page (if applicable)

If the plugin has `sidebarItems` (its own page in the sidebar), you need to:

1. **Create the Svelte component** in `desktop/monday-morning/src/components/<ComponentName>.svelte`
2. **Register it** in `desktop/monday-morning/src/lib/pluginComponents.ts`:
   ```typescript
   const PLUGIN_COMPONENTS: Record<string, LazyComponent> = {
     // ... existing entries
     MyComponentName: () => import('../components/MyComponentName.svelte')
   };
   ```
3. **Add routing** in `desktop/monday-morning/src/components/Dashboard.svelte` in the plugin view routing section (search for `sidebarItem?.componentName`):
   ```svelte
   {:else if sidebarItem?.componentName === 'MyComponentName'}
     <MyComponentName />
   ```
   Don't forget the import at the top of Dashboard.svelte.

---

## Step 6: Verify

After creating and building the plugin:

1. **Check the plugin loads**: The MCP server discovers plugins from `mcp-servers/monday-morning/plugins/` subdirectories with an `index.js` (compiled) or `index.ts`
2. **Restart the MCP server**: The manifest is regenerated on MCP server startup at `~/.monday-morning/manifest.json`. Without a restart, the desktop app won't see the new plugin.
3. **Plugin appears in Plugins modal**: Open the Plugins modal from the sidebar bottom Plugins button. The plugin should appear with its icon, name, description, and enable/disable toggle. If it has `credentials` or `projectConfig`, the settings UI is auto-rendered in the plugin card.
4. **Sidebar nav item appears**: If the plugin has `sidebarItems`, the nav icon shows in the sidebar. Items with `requiresAuth: true` only appear after credentials are configured. Items with `requiresAuth: false` appear immediately when the plugin is in the manifest.

**Key files for plugin management UI:**

- `desktop/monday-morning/src/components/PluginsModal.svelte` — standalone modal for all plugins
- `desktop/monday-morning/src/components/PluginCard.svelte` — individual card with enable/disable toggle
- `desktop/monday-morning/src/components/PluginSettingsRenderer.svelte` — auto-rendered credentials and config UI

---

## Checklist

- [ ] Plugin file created at `mcp-servers/monday-morning/plugins/<slug>/index.ts`
- [ ] Implements `MondayMorningPlugin` interface correctly
- [ ] All `as const` assertions on type literals
- [ ] `id` matches folder name
- [ ] `tools` array present (even if empty)
- [ ] `register` function present
- [ ] `ui` section with icon and tagline
- [ ] Settings schema matches the auth/config requirements
- [ ] Plugin compiled: `npm run build` produces `dist/plugins/<slug>/index.js`
- [ ] If sidebar page needed: Svelte component created, registered in `pluginComponents.ts`, and routed in `Dashboard.svelte`
- [ ] MCP server restarted to regenerate manifest
