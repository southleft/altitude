import React from 'react';
import { createComponent } from '@lit/react';
import { SLDialog as SLWebDialog } from 'sl-web-components/dist/components/dialog/dialog';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDialog.el, SLWebDialog],
  suffix: PackageJson.version
});

export const SLDialog = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDialog.el),
  elementClass: SLWebDialog,
  events: {}
});
