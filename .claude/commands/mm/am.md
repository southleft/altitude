# AM — alias for /mm:recap

`/mm:am` is now a back-compat alias for `/mm:recap`. It exists only so already-scheduled morning routines (cron jobs created against `/mm:am`) keep working after the rename.

Execute the `/mm:recap` command exactly as if the user had run `/mm:recap`: follow every step in `.claude/commands/mm/recap.md` and produce the same morning brief.
