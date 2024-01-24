import { createComponent } from '@lit/react';
import { SLCheckboxItem as SLWebCheckboxItem } from 'sl-web-components/dist/components/checkbox-item/checkbox-item';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebCheckboxItem.el, SLWebCheckboxItem],
  suffix: PackageJson.version
});

export const SLCheckboxItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebCheckboxItem.el),
  elementClass: SLWebCheckboxItem,
  events: {
    onChange: 'change'
  }
});
