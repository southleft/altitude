'use client';

import { createComponent } from '@lit/react';
import { ALBanner as ALWebBanner } from '@southleft/al-web-components/components/banner';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebBanner.el, ALWebBanner],
  suffix: PackageJson.version
});

export const ALBanner = createComponent({
  react: React,
  tagName: elementMap.get(ALWebBanner.el),
  elementClass: ALWebBanner,
  events: {
    onBannerClose: 'onBannerClose'
  }
});
