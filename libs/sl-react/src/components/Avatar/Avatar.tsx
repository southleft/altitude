import { createComponent } from '@lit/react';
import { SLAvatar as SLWebAvatar } from 'sl-web-components/dist/components/avatar/avatar';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebAvatar.el, SLWebAvatar],
  suffix: PackageJson.version
});

export const SLAvatar = createComponent({
  react: React,
  tagName: elementMap.get(SLWebAvatar.el),
  elementClass: SLWebAvatar
});
