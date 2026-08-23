# Start Task Command

You have received a task context from Monday Morning. The user has copied a formatted command that contains all the necessary information to begin working on a task.

## Command Format

The command you received follows this pattern:

```
Work on [TASK_ID]: [task_name] from spec [spec_path], project: [project_path], requirements: [requirements_path]
```

## Your Responsibilities

When this command is invoked:

1. **Parse the Context**
   - Extract the task ID (e.g., "I18", "W1-T6")
   - Extract the task name
   - Extract the spec path
   - Extract the project path
   - Extract the requirements path

2. **Load Relevant Files**
   - Read the spec file: `{spec_path}/spec.md`
   - Read the requirements: `{requirements_path}`
   - Read the implementation status: `{spec_path}/implementation.md`
   - Read the tasks file: `{project_path}/.mm/tasks/tasks.md`

3. **Provide Context to User**
   Display a summary showing:
   - Task you're working on
   - Spec you're implementing
   - Current progress
   - Requirements overview
   - Next steps

4. **Team Radar (collision check)**
   - Before writing any code, call `mm_team_radar({project_path, spec_name})` to check whether a teammate's agent is already working this spec (active work-locks, recent `working_on`/`claimed` events, open PRs / commits touching it).
   - It is **advisory and never blocks** — if it errors or returns nothing, proceed.
   - If `collisions: true`, show the `report` to the user and confirm before starting: starting in parallel risks a collision; offer to sequence, pair, or claim first.

5. **Begin Implementation**
   - Ask clarifying questions if needed
   - Create a todo list for the task
   - Start implementing the task based on the spec and requirements
   - Follow the implementation guidelines in the spec
   - Update implementation.md as you make progress

## Example

**User pastes:**

```
Work on W1-T6: Create /start-task Command from spec .mm/specs/2025-11-24-context-handoff-clipboard-integration, project: /Users/justin/Sites/proto/nov25/mm-project-management, requirements: .mm/specs/2025-11-24-context-handoff-clipboard-integration/requirements.md
```

**You should:**

1. Read `.mm/specs/2025-11-24-context-handoff-clipboard-integration/spec.md`
2. Read `.mm/specs/2025-11-24-context-handoff-clipboard-integration/requirements.md`
3. Read `.mm/specs/2025-11-24-context-handoff-clipboard-integration/implementation.md`
4. Summarize what W1-T6 entails
5. Create a todo list if needed
6. Begin implementation

## Notes

- The spec path is relative to the project root
- All file paths should be treated as relative unless they start with `/`
- If you can't find a file, ask the user to verify the path
- Always read the spec before starting implementation
- Follow the coding standards in `.mm/standards/` if they exist
