// T3.1 follow-up — CEM analyzer plugin for Altitude conventions.
//
// 1. `static el = 'al-foo'` → injects `tagName: 'al-foo'` and the
//    custom-element declaration so the manifest can map class → tag.
// 2. Recognizes the legacy `* - **slot**` / `* - **slot** "name"` prose in
//    the class JSDoc and converts to proper `slots` entries on the
//    declaration. Same for `* - **csspart**`, `* - **cssproperty**`,
//    `* - **event**` — covers the existing ~64 components without a source
//    codemod. (T3.2 will codemod the prose once schemas are validating.)
//
// Plugin shape per @custom-elements-manifest/analyzer:
//   default export an array of plugin objects with `analyzePhase`/
//   `moduleLinkPhase`/`packageLinkPhase` hooks.

import ts from 'typescript';

function parseClassDocSlots(jsdocText) {
  const slots = [];
  // Lines like: * - **slot**: description
  //         or: * - **slot** "name": description
  const slotRe = /^\s*\*?\s*-\s*\*\*slot\*\*(?:\s+"([^"]+)")?:?\s*(.*)$/gim;
  for (const m of jsdocText.matchAll(slotRe)) {
    slots.push({ name: m[1] || '', description: (m[2] || '').trim() });
  }
  return slots;
}

function parseClassDocEvents(jsdocText) {
  const events = [];
  // * @event onWhatever - description     OR    * - **event** "onWhatever": …
  const tagRe = /^\s*\*?\s*@event\s+([A-Za-z_$][\w$]*)\s*[-:]?\s*(.*)$/gim;
  for (const m of jsdocText.matchAll(tagRe)) {
    events.push({ name: m[1], description: m[2].trim() });
  }
  const proseRe = /^\s*\*?\s*-\s*\*\*event\*\*\s+"([^"]+)":?\s*(.*)$/gim;
  for (const m of jsdocText.matchAll(proseRe)) {
    events.push({ name: m[1], description: (m[2] || '').trim() });
  }
  return events;
}

function parseClassDocCssParts(jsdocText) {
  const parts = [];
  const tagRe = /^\s*\*?\s*@csspart\s+([^\s]+)\s*[-:]?\s*(.*)$/gim;
  for (const m of jsdocText.matchAll(tagRe)) parts.push({ name: m[1], description: m[2].trim() });
  return parts;
}

function parseClassDocCssProperties(jsdocText) {
  const out = [];
  const tagRe = /^\s*\*?\s*@cssproperty\s+([^\s]+)\s*[-:]?\s*(.*)$/gim;
  for (const m of jsdocText.matchAll(tagRe)) out.push({ name: m[1], description: m[2].trim() });
  return out;
}

export default function altitudeConventions() {
  return {
    name: 'altitude-conventions',
    analyzePhase({ ts: tsApi, node, moduleDoc }) {
      if (!tsApi.isClassDeclaration(node) || !node.name) return;
      const className = node.name.text;
      const classDecl = (moduleDoc.declarations || []).find(
        (d) => d.kind === 'class' && d.name === className
      );
      if (!classDecl) return;

      // 1. `static el = '...'` → tagName.
      for (const member of node.members || []) {
        if (
          tsApi.isPropertyDeclaration(member) &&
          member.modifiers?.some((m) => m.kind === tsApi.SyntaxKind.StaticKeyword) &&
          member.name &&
          tsApi.isIdentifier(member.name) &&
          member.name.text === 'el' &&
          member.initializer &&
          tsApi.isStringLiteral(member.initializer)
        ) {
          const tag = member.initializer.text;
          classDecl.tagName = tag;
          classDecl.customElement = true;
          // Also surface in the module's exports as a custom-element-definition.
          moduleDoc.exports = moduleDoc.exports || [];
          if (!moduleDoc.exports.find((e) => e.kind === 'custom-element-definition' && e.name === tag)) {
            moduleDoc.exports.push({
              kind: 'custom-element-definition',
              name: tag,
              declaration: { name: className, module: moduleDoc.path },
            });
          }
          break;
        }
      }

      // 2. Parse the leading JSDoc comment on the class for slots/events/parts/props.
      const fullText = node.getFullText();
      const triviaWidth = node.getLeadingTriviaWidth();
      const leading = fullText.slice(0, triviaWidth);
      const slots = parseClassDocSlots(leading);
      const events = parseClassDocEvents(leading);
      const cssParts = parseClassDocCssParts(leading);
      const cssProps = parseClassDocCssProperties(leading);

      // 3. AST-walk for `this.dispatch({ eventName: '…' })` calls inside the
      // class. The ALElement.dispatch helper is the only event publisher,
      // and every call site documents the public event name as a string
      // literal — surface those as `events`.
      const dispatchedEvents = new Set();
      const visitForDispatch = (n) => {
        if (
          tsApi.isCallExpression(n) &&
          tsApi.isPropertyAccessExpression(n.expression) &&
          n.expression.name.text === 'dispatch' &&
          n.arguments.length === 1 &&
          tsApi.isObjectLiteralExpression(n.arguments[0])
        ) {
          for (const prop of n.arguments[0].properties) {
            if (
              tsApi.isPropertyAssignment(prop) &&
              tsApi.isIdentifier(prop.name) &&
              prop.name.text === 'eventName' &&
              tsApi.isStringLiteral(prop.initializer)
            ) {
              dispatchedEvents.add(prop.initializer.text);
            }
          }
        }
        tsApi.forEachChild(n, visitForDispatch);
      };
      visitForDispatch(node);
      const ast_events = [...dispatchedEvents].map((name) => ({ name, description: '' }));

      const mergedEvents = [
        ...events,
        ...ast_events.filter((e) => !events.some((x) => x.name === e.name)),
      ];

      if (slots.length) classDecl.slots = [...(classDecl.slots || []), ...slots];
      if (mergedEvents.length) classDecl.events = [...(classDecl.events || []), ...mergedEvents];
      if (cssParts.length) classDecl.cssParts = [...(classDecl.cssParts || []), ...cssParts];
      if (cssProps.length) classDecl.cssProperties = [...(classDecl.cssProperties || []), ...cssProps];
    },
  };
}
