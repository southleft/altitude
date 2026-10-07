/**
 * Canvas comments: pins over the canvas, the composer and the thread panel. Visual state
 * is bound through `data-*` attributes (`data-state`, `data-selected`, `data-orphaned`).
 */
const commentsTheme = {
  slots: {
    layer: 'pointer-events-none absolute inset-0 z-20 overflow-hidden',
    pin: 'pointer-events-auto absolute flex size-7 -translate-y-full cursor-pointer items-center justify-center rounded-full rounded-bl-none border-2 border-white bg-accent text-[10px] font-semibold text-white shadow-md outline-none transition-transform select-none focus-visible:ring-2 focus-visible:ring-accent/60 data-[selected=true]:scale-110 data-[state=closed]:bg-muted data-[state=closed]:opacity-60 data-[orphaned=true]:border-dashed data-[draft=true]:bg-surface data-[draft=true]:text-panel motion-reduce:transition-none',
    pinAvatar: 'size-full rounded-full rounded-bl-none object-cover',
    composer:
      'pointer-events-auto absolute z-40 flex w-64 flex-col gap-2 rounded-lg border border-border bg-panel p-2 shadow-[0_8px_30px_rgb(0_0_0/0.3)]',
    composerFooter: 'flex items-center justify-end gap-1.5',
    panel:
      'pointer-events-auto absolute top-2 right-2 bottom-16 z-30 flex w-72 flex-col overflow-hidden rounded-lg border border-border bg-panel text-surface shadow-[0_8px_30px_rgb(0_0_0/0.3)]',
    panelHeader: 'flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5',
    panelTitle: 'flex-1 truncate text-xs font-semibold',
    panelToolbar:
      'flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-[11px] text-muted',
    panelBody: 'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2',
    panelMessage: 'px-1 py-4 text-center text-[11px] leading-relaxed text-muted',
    section: 'flex flex-col gap-1',
    sectionTitle: 'px-1 text-[10px] font-semibold tracking-wide text-muted uppercase',
    sectionHint: 'px-1 text-[10px] leading-snug text-muted',
    row: 'flex w-full cursor-pointer items-start gap-2 rounded-md p-1.5 text-left outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent data-[selected=true]:bg-hover data-[state=closed]:opacity-70',
    avatar: 'size-5 shrink-0 rounded-full bg-hover object-cover',
    avatarFallback:
      'flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-white',
    rowBody: 'flex min-w-0 flex-1 flex-col gap-0.5',
    rowMeta: 'flex items-center gap-1 text-[10px] text-muted',
    rowAuthor: 'truncate font-medium text-surface',
    rowTitle: 'line-clamp-2 text-[11px] leading-snug break-words',
    thread: 'flex flex-col gap-2',
    message: 'flex flex-col gap-1',
    messageHeader: 'flex items-center gap-1.5 text-[10px] text-muted',
    messageBody: 'min-w-0 text-[11px] break-words',
    actions: 'flex flex-wrap items-center gap-1.5',
    replyForm: 'flex flex-col gap-1.5 border-t border-border pt-2'
  }
}

export type CommentsTheme = typeof commentsTheme
export default commentsTheme
