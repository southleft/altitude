/**
 * GitHub commit popover. Visual state is bound through `data-state` (`clean`, `dirty`,
 * `working`, `attention`) so the template never branches on utility classes.
 */
const versionControlTheme = {
  slots: {
    trigger:
      'flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded border border-border px-2 text-[11px] font-medium text-surface transition-colors outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent data-[state=clean]:border-transparent data-[state=clean]:text-muted data-[state=clean]:hover:text-surface',
    triggerIcon: 'size-3.5 shrink-0',
    triggerLabel: 'truncate',
    dot: 'size-2 shrink-0 rounded-full bg-muted/60 data-[state=dirty]:bg-[var(--color-warning)] data-[state=attention]:bg-[var(--color-error)] data-[state=working]:animate-pulse data-[state=working]:motion-reduce:animate-none',
    content: 'flex flex-col gap-3 text-surface',
    header: 'flex flex-col gap-1',
    title: 'text-xs font-semibold',
    description: 'text-[11px] leading-relaxed break-words text-muted',
    status: 'flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted',
    sha: 'font-mono text-surface',
    field: 'flex flex-col gap-1',
    label: 'text-[11px] font-medium',
    hint: 'text-[11px] leading-snug text-muted',
    footer: 'flex items-center justify-end gap-2'
  }
}

export type VersionControlTheme = typeof versionControlTheme
export default versionControlTheme
