import { createComponent } from '@lit/react';
import { SLFieldNote as SLWebFieldNote } from 'sl-web-components/dist/components/field-note/field-note';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebFieldNote.el, SLWebFieldNote],
  suffix: PackageJson.version
});

export const SLFieldNote = createComponent({
  react: React,
  tagName: elementMap.get(SLWebFieldNote.el),
  elementClass: SLWebFieldNote,
  events: {}
});
