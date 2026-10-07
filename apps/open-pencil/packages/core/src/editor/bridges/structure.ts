import type { createSelectionActions } from '#core/editor/selection'
import type { createStructureActions } from '#core/editor/structure'

type SelectionActions = ReturnType<typeof createSelectionActions>
type StructureActions = ReturnType<typeof createStructureActions>

export function createStructureBridge(structure: StructureActions, selection: SelectionActions) {
  return {
    wrapInAutoLayout: () => structure.wrapInAutoLayout(selection.getSelectedNodes()),
    groupSelected: () => structure.groupSelected(selection.getSelectedNodes()),
    frameSelection: () => structure.frameSelection(selection.getSelectedNodes()),
    booleanOperationSelected: (operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE') =>
      structure.booleanOperationSelected(selection.getSelectedNodes(), operation),
    flattenSelected: () => structure.flattenSelected(selection.getSelectedNodes()),
    outlineTextSelected: () => structure.outlineTextSelected(selection.getSelectedNodes()),
    outlineStrokeSelected: () => structure.outlineStrokeSelected(selection.getSelectedNodes()),
    ungroupSelected: () => structure.ungroupSelected(selection.getSelectedNode())
  }
}
