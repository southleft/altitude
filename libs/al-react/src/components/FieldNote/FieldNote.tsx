import { createComponent } from '@lit/react';
import { ALFieldNote as ALWebFieldNote } from 'al-web-components/dist/components/field-note/field-note';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebFieldNote.el, ALWebFieldNote],
  suffix: PackageJson.version
});

export const ALFieldNote = createComponent({
  react: React,
  tagName: elementMap.get(ALWebFieldNote.el),
  elementClass: ALWebFieldNote,
  events: {}
});
