/**
 * GitHub commit popover. Visual state is bound through `data-state` (`clean`, `dirty`,
 * `working`, `attention`) so the template never branches on utility classes.
 */
const versionControlTheme = {
  slots: {
    // Unbound documents show a "Save to GitHub" label that truncates in a narrow panel.
    trigger:
      'flex h-7 min-w-0 shrink cursor-pointer items-center gap-1.5 rounded border border-border px-2 text-[11px] font-medium text-surface transition-colors outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent data-[state=clean]:border-transparent data-[state=clean]:text-muted data-[state=clean]:hover:text-surface',
    triggerIcon: 'size-3.5 shrink-0',
    triggerLabel: 'min-w-0 truncate',
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
    footer: 'flex items-center justify-end gap-2',
    branchTrigger:
      'flex h-6 max-w-24 min-w-0 cursor-pointer items-center gap-1 rounded border border-transparent px-1.5 text-[11px] font-medium text-muted transition-colors outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-accent data-[state=open]:bg-hover data-[state=open]:text-surface',
    branchList: 'flex max-h-56 flex-col overflow-y-auto py-0.5',
    branchItem:
      'flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded px-1.5 text-[11px] outline-none select-none data-[highlighted]:bg-hover data-[state=checked]:font-semibold',
    branchName: 'min-w-0 flex-1 truncate font-mono',
    branchBadge: 'shrink-0 text-[10px] text-muted',
    branchMessage: 'px-1.5 py-3 text-center text-[11px] text-muted',
    pull: 'flex flex-col gap-1.5 rounded-md border border-border p-2',
    pullHeader: 'flex flex-wrap items-center gap-1.5 text-[11px]',
    pullState:
      'shrink-0 rounded px-1.5 py-px text-[10px] font-medium text-white data-[state=open]:bg-[var(--color-success-bg)] data-[state=draft]:bg-muted data-[state=merged]:bg-[#8250df] data-[state=closed]:bg-[var(--color-error)]',
    divider: '-mx-3 border-t border-border'
  }
}

export type VersionControlTheme = typeof versionControlTheme
export default versionControlTheme
