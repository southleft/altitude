# Connect Notion

Guided setup to connect a Notion database to this project for bidirectional sync.

## Usage

```
/mm:connect-notion
/mm:connect-notion https://www.notion.so/workspace/My-Database-abc123
```

## Instructions

You are guiding the user through connecting a Notion database to their Monday Morning project. The goal is to configure `.mm/config.json` so that `/mm:sync-notion` (or `mm_sync_notion`) works correctly.

### Step 1: Check existing config

Read `.mm/config.json` and check `integrations.notion`. If already configured and enabled, show the current setup and ask if they want to reconfigure or just run a sync.

### Step 2: Check for NOTION_TOKEN

Check if `NOTION_TOKEN` is set in the environment (`echo $NOTION_TOKEN | head -c 10`).

If **not set**:

- Tell the user they need a Notion internal integration token
- Direct them to https://www.notion.so/my-integrations to create one
- Tell them to share the target database with the integration in Notion (click "..." menu on the database page, then "Connections", then add the integration)
- Ask them to provide the token, or run `! export NOTION_TOKEN=ntn_...` to set it in this session
- Suggest they add it to their shell profile or MCP server env config for persistence
- **Stop here and wait for the token before proceeding**

If **set**: confirm it and proceed.

### Step 3: Identify the database

If the user provided a Notion URL as an argument, extract the ID from it (the 32-character hex string at the end of the URL, formatted as a UUID with hyphens).

If no URL was provided, try to list databases the integration can see by calling the Notion API:

```bash
curl -s "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"filter":{"property":"object","value":"database"},"page_size":20}'
```

Parse the results and present the user with a numbered list of available databases (show title and ID). Ask them to pick one.

**Important: Page vs Database distinction.** Notion URLs often point to pages, not databases. If the ID resolves to a page (the API returns a 400 saying "is a page, not a database"), check the page's children for child_database blocks:

```bash
curl -s "https://api.notion.com/v1/blocks/{page_id}/children?page_size=100" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28"
```

List any child databases found and ask the user to pick one.

### Step 4: Identify the user (for assignee filtering)

Query the Notion users API to find the user's Notion account:

```bash
curl -s "https://api.notion.com/v1/users" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28"
```

List the **person** type users (not bots) and ask which one is them. If there's only one person, confirm it.

If the user doesn't want assignee filtering (they want all tickets), skip this — leave `assignee_id` unset.

### Step 5: Save the configuration

Use `mm_configure_integration` to save the config:

```
mm_configure_integration({
  project_path: "<project root>",
  service: "notion",
  config: {
    enabled: true,
    database_id: "<selected database ID>",
    assignee_name: "<user's name>",
    assignee_id: "<user's Notion ID>"
  }
})
```

### Step 6: Test with a dry pull

Run `mm_sync_notion` with `direction: "pull"` to verify everything works. Report how many pages were found.

If it fails, diagnose the issue:

- Token invalid? Check permissions.
- Database not found? The integration may not have access — remind user to share it.
- No pages? The assignee filter might be too narrow, or the database is empty.

### Step 7: Summary

Print a summary:

```
Notion connected!
  Database: <name> (<id>)
  Assignee filter: <name> (<id>) — or "None (syncing all pages)"
  Pages found: <count>

To sync: /mm:sync-notion or mm_sync_notion
To reconfigure: /mm:connect-notion
```

---

**Key principle:** Make it impossible to get the page-vs-database confusion wrong. Always validate the ID is actually a database before saving config.
