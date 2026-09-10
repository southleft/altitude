import fs from 'node:fs';
const edits = {
 'banner': {isDismissible:'Dismissible'}, 'chip':{isDismissible:'Dismissible'},
 'checkbox':{isError:'State'}, 'input-stepper':{isError:'State'},
 'link':{isDisabled:'State'}, 'range':{isDisabled:'State'}, 'table':{isSelectable:'Selectable'},
 'tooltip':{hasArrow:'Arrow'}, 'select':{hideLabel:'Label'}
};
for(const [name, props] of Object.entries(edits)) {
 const path = `.altitude/contracts/altitude/al-${name}.contract.json`;
 const c=JSON.parse(fs.readFileSync(path,'utf8'));
 for(const [name,axis] of Object.entries(props)) {
  const p=c.props.find(p=>p.name===name);
  if(!p || p.type!=='boolean') throw new Error('Expected boolean '+name);
  p.bindings.figma={...(p.bindings.figma||{}),pairWith:axis};
 }
 fs.writeFileSync(path,JSON.stringify(c,null,2)+'\n');
}
