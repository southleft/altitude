import { createComponent } from '@lit/react';
import { SLIconAddSquare as SLWebIconAddSquare } from 'sl-web-components/dist/components/icon/icons/add-square';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconAddSquare.el, SLWebIconAddSquare],
  suffix: PackageJson.version
});

export const SLIconAddSquare = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconAddSquare.el),
  elementClass: SLWebIconAddSquare,
  events: {}
});
