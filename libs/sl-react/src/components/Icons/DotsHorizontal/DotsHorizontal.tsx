import { createComponent } from '@lit/react';
import { SLIconDotsHorizontal as SLWebIconDotsHorizontal } from 'sl-web-components/dist/components/icon/icons/dots-horizontal';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconDotsHorizontal.el, SLWebIconDotsHorizontal],
  suffix: PackageJson.version
});

export const SLIconDotsHorizontal = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconDotsHorizontal.el),
  elementClass: SLWebIconDotsHorizontal,
  events: {}
});
