import { createComponent } from '@lit-labs/react';
import { SLIconAdd as SLWebIconAdd } from 'sl-web-components/dist/components/icon/icons/add';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconAdd.el, SLWebIconAdd],
  suffix: PackageJson.version
});

export const SLIconAdd = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconAdd.el),
  elementClass: SLWebIconAdd,
  events: {}
});
