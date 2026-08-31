# Activate Monday Morning License

Show the user's current tier and explain how to activate a Pro or Team license key.

## Usage

```
/mm:activate
```

No arguments.

## Instructions

### Step 1: Check Current Tier

Call the MCP tool `mm_check_tier` with no arguments. The response has the shape:

```
{
  tier: "free" | "pro" | "team",
  expiresAt: string | null,
  graceDeadline: string | null,
  keyPresent: boolean,
  ...
}
```

### Step 2: Report Status

Produce output based on the response.

**If `tier` is `"pro"` or `"team"`:**

```
You're on Monday Morning {Tier}.

{expiresAt ? "Renews: " + expiresAt : ""}
{graceDeadline ? "Grace period until: " + graceDeadline : ""}

To manage your subscription, open the desktop app → Settings → License.
```

**If `tier` is `"free"` and `keyPresent` is `true`:**

The stored key is present but the tier has dropped (expired or grace period
over). Output:

```
Your license is no longer active — the key on file has expired or failed validation.

{expiresAt ? "Expired: " + expiresAt : ""}

To reactivate or enter a new key, open the desktop app → Settings → License.
```

**If `tier` is `"free"` and `keyPresent` is `false`:**

```
You're on Monday Morning Free.

Pro — $12/mo (annual) / $15/mo (monthly)
Unlimited projects, parallel orchestration, full session history,
product planning, document generation, health & reviews.

To activate a key you already have, open the desktop app → Settings → License,
and paste the key into the activation field.

To purchase a key, visit getmondaymorning.com/pro.
```

### Step 3: Stop

Activation itself happens in the desktop app — license keys are stored in an
encrypted credential store under the OS user account, and the activation flow
requires an online call to the license server. The slash command does not
activate a key directly; it only reports status and points to the UI.

Do not ask the user to paste their key into the chat.
