import { createComponent } from '@lit/react';
import { ALHero as ALWebHero } from 'al-web-components/components/hero';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebHero.el, ALWebHero],
  suffix: PackageJson.version
});

export const ALHero = createComponent({
  react: React,
  tagName: elementMap.get(ALWebHero.el),
  elementClass: ALWebHero,
  events: {}
});
