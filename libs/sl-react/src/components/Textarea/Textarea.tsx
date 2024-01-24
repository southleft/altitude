import { createComponent } from '@lit/react';
import { SLTextarea as SLWebTextarea } from 'sl-web-components/dist/components/textarea/textarea';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTextarea.el, SLWebTextarea],
  suffix: PackageJson.version
});

export const SLTextarea = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTextarea.el),
  elementClass: SLWebTextarea,
  events: {}
});
