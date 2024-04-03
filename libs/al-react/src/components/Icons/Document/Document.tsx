import { createComponent } from '@lit/react';
import { ALIconDocument as ALWebIconDocument } from '@southleft/al-web-components/dist/components/icon/icons/document';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconDocument.el, ALWebIconDocument],
  suffix: PackageJson.version
});

export const ALIconDocument = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconDocument.el),
  elementClass: ALWebIconDocument,
  events: {}
});
