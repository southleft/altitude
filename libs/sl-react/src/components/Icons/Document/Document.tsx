import { createComponent } from '@lit/react';
import { SLIconDocument as SLWebIconDocument } from 'sl-web-components/dist/components/icon/icons/document';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconDocument.el, SLWebIconDocument],
  suffix: PackageJson.version
});

export const SLIconDocument = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconDocument.el),
  elementClass: SLWebIconDocument,
  events: {}
});
