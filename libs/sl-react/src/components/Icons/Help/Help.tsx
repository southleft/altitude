import { createComponent } from '@lit-labs/react';
import { SLIconHelp as SLWebIconHelp } from 'sl-web-components/dist/sl/components/icon/icons/help';
import register from 'sl-web-components/dist/sl/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconHelp.el, SLWebIconHelp],
  suffix: PackageJson.version
});

export const SLIconHelp = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconHelp.el),
  elementClass: SLWebIconHelp,
  events: {}
});
