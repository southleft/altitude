/**
 * Visual state is bound through `data-status` (an `AgentConnectionStatus`) so
 * the template never branches on utility classes.
 */
const agentConnectTheme = {
  slots: {
    trigger:
      'flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded border border-border px-2 text-[11px] font-medium text-surface transition-colors outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent data-[status=connected]:border-transparent data-[status=connected]:text-muted data-[status=connected]:hover:text-surface',
    triggerIcon: 'size-3.5 shrink-0',
    dot: 'size-2 shrink-0 rounded-full bg-muted/60 data-[status=connected]:bg-[var(--color-success)] data-[status=offline]:bg-[var(--color-error)] data-[status=starting]:animate-pulse data-[status=starting]:motion-reduce:animate-none',
    content: 'flex flex-col gap-3 text-surface',
    header: 'flex flex-col gap-1',
    title: 'text-xs font-semibold',
    description: 'text-[11px] leading-relaxed text-muted',
    status: 'flex items-start gap-2 rounded-md border border-border px-2.5 py-2',
    statusDot: 'mt-1',
    statusBody: 'flex min-w-0 flex-col gap-0.5',
    statusLabel: 'text-[11px] font-medium',
    hint: 'text-[11px] leading-snug text-muted',
    step: 'flex flex-col gap-1',
    stepLabel: 'text-[11px] font-medium',
    command: 'flex items-start gap-1 rounded-md bg-canvas py-1 pr-1 pl-2',
    code: 'min-w-0 flex-1 py-0.5 font-mono text-[10px] leading-relaxed break-all whitespace-pre-wrap select-all',
    keyActions: 'flex flex-wrap items-center gap-1.5',
    footer: 'flex items-center justify-between gap-2'
  }
}

export type AgentConnectTheme = typeof agentConnectTheme
export default agentConnectTheme
