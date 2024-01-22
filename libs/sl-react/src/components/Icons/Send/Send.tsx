import { createComponent } from '@lit-labs/react';
import { SLIconSend as SLWebIconSend } from 'sl-web-components/dist/sl/components/icon/icons/send';
import register from 'sl-web-components/dist/sl/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconSend.el, SLWebIconSend],
  suffix: PackageJson.version
});

export const SLIconSend = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconSend.el),
  elementClass: SLWebIconSend,
  events: {}
});
