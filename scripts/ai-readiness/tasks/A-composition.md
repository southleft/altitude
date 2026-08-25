# Task A — Compose a real pattern (attempt {{ATTEMPT}})

You are an AI agent helping a developer compose a UI pattern using Altitude.

**Pattern to build:** a "user profile card" that includes:
1. A header row with: avatar (circular, on the left), display name (next to avatar), and a status badge (e.g. "Active").
2. A top-right 3-dot action menu (kebab) with at least: "Edit profile", "Send message", "Block user".
3. A short bio paragraph in the body.
4. A bottom-right primary button labeled "View profile".

Constraints:
- Use only real `<al-*>` components from the Altitude design system.
- Wrap the pattern in `<al-theme>` per the v2 theming model.
- Do not invent tags, attributes, slots, or events.
- For enum-typed attributes (variant, position, mode, brand, etc.), use only values that appear in the manifest digest's `type` field.

Return strict JSON matching this exact shape (these key names are the contract — do not rename `template` to `markup`, `usedComponents` to `components`, etc.):

```json
{
  "template": "<al-theme …>…</al-theme>",
  "usedComponents": [
    {
      "tag": "al-button",
      "attributes": ["variant", "label"],
      "slots": ["(default)", "before"],
      "events": []
    }
  ],
  "assumptions": ["…"],
  "sourceUsed": ["docs only"]
}
```

`template` must be a Lit html template body. Every tag / attribute / slot / event you list in `usedComponents` MUST match the ground-truth manifest at `{{TMPDIR}}/ai-readiness-cem-digest.json`. Every CSS custom property name you reference MUST exist in `{{TMPDIR}}/ai-readiness-tokens-digest.json`. If you're unsure, Read those files.

If you have to fall back to reading source code under `libs/al-web-components/components/`, list every file in `sourceUsed`. Otherwise put `["docs only"]`.
