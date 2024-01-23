import { createComponent } from '@lit-labs/react';
import { SLIconInfo as SLWebIconInfo } from 'sl-web-components/dist/sl/components/icon/icons/info';
import register from 'sl-web-components/dist/sl/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconInfo.el, SLWebIconInfo],
  suffix: PackageJson.version
});

export const SLIconInfo = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconInfo.el),
  elementClass: SLWebIconInfo,
  events: {}
});