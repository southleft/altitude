import { createComponent } from '@lit/react';
import { SLIconDotsVertical as SLWebIconDotsVertical } from 'sl-web-components/dist/components/icon/icons/dots-vertical';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconDotsVertical.el, SLWebIconDotsVertical],
  suffix: PackageJson.version
});

export const SLIconDotsVertical = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconDotsVertical.el),
  elementClass: SLWebIconDotsVertical,
  events: {}
});
