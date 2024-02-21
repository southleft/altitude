import React from 'react';
import { createComponent } from '@lit/react';
import { ALDialog as ALWebDialog } from 'al-web-components/dist/components/dialog/dialog';
import register from 'al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDialog.el, ALWebDialog],
  suffix: PackageJson.version
});

export const ALDialog = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDialog.el),
  elementClass: ALWebDialog,
  events: {}
});
