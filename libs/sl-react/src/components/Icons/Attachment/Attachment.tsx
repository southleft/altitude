import { createComponent } from '@lit/react';
import { SLIconAttachment as SLWebIconAttachment } from 'sl-web-components/dist/components/icon/icons/attachment';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconAttachment.el, SLWebIconAttachment],
  suffix: PackageJson.version
});

export const SLIconAttachment = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconAttachment.el),
  elementClass: SLWebIconAttachment,
  events: {}
});
