import {posix} from 'node:path';

/** Expand local/imported literal aliases so the CEM can enforce enum values. */
export default function literalTypes() {
  const aliases=new Map(), imports=new Map();
  return {
    name:'altitude-literal-types',
    analyzePhase({ts,node,moduleDoc}) {
      const path=moduleDoc.path.replaceAll('\\','/');
      if(ts.isTypeAliasDeclaration(node)) {
        const types=ts.isUnionTypeNode(node.type)?node.type.types:[node.type];
        if(types.every(t=>ts.isLiteralTypeNode(t)&&ts.isStringLiteral(t.literal))) {
          aliases.set(path+':'+node.name.text,types.map(t=>JSON.stringify(t.literal.text)).join(' | '));
        }
      }
      if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('.')) {
        const bindings=node.importClause?.namedBindings;
        if(!bindings||!ts.isNamedImports(bindings))return;
        let target=posix.normalize(posix.join(posix.dirname(path),node.moduleSpecifier.text));
        if(!/\.tsx?$/.test(target))target+='.ts';
        for(const item of bindings.elements)imports.set(path+':'+item.name.text,target+':'+(item.propertyName||item.name).text);
      }
    },
    packageLinkPhase({customElementsManifest}) {
      for(const module of customElementsManifest.modules||[])for(const declaration of module.declarations||[]) {
        for(const member of [...(declaration.members||[]),...(declaration.attributes||[])]) {
          const key=module.path.replaceAll('\\','/')+':'+member.type?.text;
          const expanded=aliases.get(key)||aliases.get(imports.get(key));
          if(expanded)member.type={...member.type,text:expanded.replaceAll('"',"'")};
        }
      }
    }
  };
}
