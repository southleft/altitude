import { createComponent } from '@lit-labs/react';
import { SLIconClose as SLWebIconClose } from 'sl-web-components/dist/sl/components/icon/icons/close';
import register from 'sl-web-components/dist/sl/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconClose.el, SLWebIconClose],
  suffix: PackageJson.version
});

export const SLIconClose = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconClose.el),
  elementClass: SLWebIconClose,
  events: {}
});
