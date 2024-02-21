/*! For license information please see components-CheckboxGroup-CheckboxGroup-stories.3c3f2231.iframe.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunkal_react=self.webpackChunkal_react||[]).push([[7819],{"./src/components/CheckboxGroup/CheckboxGroup.stories.tsx":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{Default:()=>Default,Disabled:()=>Disabled,Error:()=>Error,HiddenLegend:()=>HiddenLegend,Horizontal:()=>Horizontal,SlottedErrorNote:()=>SlottedErrorNote,SlottedFieldNote:()=>SlottedFieldNote,__namedExportsOrder:()=>__namedExportsOrder,default:()=>__WEBPACK_DEFAULT_EXPORT__});var ___WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./src/index.ts"),react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("../../node_modules/react/jsx-runtime.js");const __WEBPACK_DEFAULT_EXPORT__={title:"Molecules/Checkbox Group",component:___WEBPACK_IMPORTED_MODULE_0__.di,subcomponents:{ALCheckbox:___WEBPACK_IMPORTED_MODULE_0__.di},parameters:{status:{type:"beta"},actions:{handles:["onCheckboxGroupChange"]}},argTypes:{isError:{control:"boolean"},isDisabled:{control:"boolean"},isRequired:{control:"boolean"},hideLegend:{control:"boolean"},label:{control:"text"},errorNote:{control:"text"},fieldNote:{control:"text"},fieldId:{control:"text"},ariaDescribedBy:{control:"text"},variant:{control:"radio",options:["default","horizontal"]}},args:{label:"Checkbox group legend label",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment,{children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-1",children:"Checkbox 1"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-2",children:"Checkbox 2"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-3",children:"Checkbox 3"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-4",isDisabled:!0,children:"Checkbox 4"})]}),fieldNote:"This is a field note."}};var Default={args:{}},Error={args:{isError:!0,isRequired:!0,fieldNote:"",errorNote:"This is an error note."}},Disabled={args:{isDisabled:!0}},HiddenLegend={args:{hideLegend:!0}},Horizontal={args:{variant:"horizontal"}},SlottedFieldNote={args:{children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment,{children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-1",children:"Checkbox 1"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-2",children:"Checkbox 2"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-3",children:"Checkbox 3"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-4",isDisabled:!0,children:"Checkbox 4"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(___WEBPACK_IMPORTED_MODULE_0__.u2,{slot:"field-note",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.IG,{}),"This is a field note."]})]})}},SlottedErrorNote={args:{isError:!0,isRequired:!0,fieldNote:"",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment,{children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-1",children:"Checkbox 1"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-2",children:"Checkbox 2"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-3",children:"Checkbox 3"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.di,{name:"checkbox-name",value:"checkbox-value-4",isDisabled:!0,children:"Checkbox 4"}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(___WEBPACK_IMPORTED_MODULE_0__.u2,{slot:"error",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(___WEBPACK_IMPORTED_MODULE_0__.$6,{}),"This is an error note."]})]})}};Default.parameters={...Default.parameters,docs:{...Default.parameters?.docs,source:{originalSource:"{\n  args: {}\n}",...Default.parameters?.docs?.source}}},Error.parameters={...Error.parameters,docs:{...Error.parameters?.docs,source:{originalSource:"{\n  args: {\n    isError: true,\n    isRequired: true,\n    fieldNote: '',\n    errorNote: 'This is an error note.'\n  }\n}",...Error.parameters?.docs?.source}}},Disabled.parameters={...Disabled.parameters,docs:{...Disabled.parameters?.docs,source:{originalSource:"{\n  args: {\n    isDisabled: true\n  }\n}",...Disabled.parameters?.docs?.source}}},HiddenLegend.parameters={...HiddenLegend.parameters,docs:{...HiddenLegend.parameters?.docs,source:{originalSource:"{\n  args: {\n    hideLegend: true\n  }\n}",...HiddenLegend.parameters?.docs?.source}}},Horizontal.parameters={...Horizontal.parameters,docs:{...Horizontal.parameters?.docs,source:{originalSource:"{\n  args: {\n    variant: 'horizontal'\n  }\n}",...Horizontal.parameters?.docs?.source}}},SlottedFieldNote.parameters={...SlottedFieldNote.parameters,docs:{...SlottedFieldNote.parameters?.docs,source:{originalSource:'{\n  args: {\n    children: <>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</ALCheckbox>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</ALCheckbox>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</ALCheckbox>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</ALCheckbox>\n        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>\n      </>\n  }\n}',...SlottedFieldNote.parameters?.docs?.source}}},SlottedErrorNote.parameters={...SlottedErrorNote.parameters,docs:{...SlottedErrorNote.parameters?.docs,source:{originalSource:'{\n  args: {\n    isError: true,\n    isRequired: true,\n    fieldNote: \'\',\n    children: <>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</ALCheckbox>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</ALCheckbox>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</ALCheckbox>\n        <ALCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</ALCheckbox>\n        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>\n      </>\n  }\n}',...SlottedErrorNote.parameters?.docs?.source}}};const __namedExportsOrder=["Default","Error","Disabled","HiddenLegend","Horizontal","SlottedFieldNote","SlottedErrorNote"]},"../../node_modules/react/cjs/react-jsx-runtime.production.min.js":(__unused_webpack_module,exports,__webpack_require__)=>{var f=__webpack_require__("../../node_modules/react/index.js"),k=Symbol.for("react.element"),l=Symbol.for("react.fragment"),m=Object.prototype.hasOwnProperty,n=f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,p={key:!0,ref:!0,__self:!0,__source:!0};function q(c,a,g){var b,d={},e=null,h=null;for(b in void 0!==g&&(e=""+g),void 0!==a.key&&(e=""+a.key),void 0!==a.ref&&(h=a.ref),a)m.call(a,b)&&!p.hasOwnProperty(b)&&(d[b]=a[b]);if(c&&c.defaultProps)for(b in a=c.defaultProps)void 0===d[b]&&(d[b]=a[b]);return{$$typeof:k,type:c,key:e,ref:h,props:d,_owner:n.current}}exports.Fragment=l,exports.jsx=q,exports.jsxs=q},"../../node_modules/react/jsx-runtime.js":(module,__unused_webpack_exports,__webpack_require__)=>{module.exports=__webpack_require__("../../node_modules/react/cjs/react-jsx-runtime.production.min.js")}}]);