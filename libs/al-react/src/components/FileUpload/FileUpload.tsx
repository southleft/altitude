import React from 'react';
import { createComponent } from '@lit/react';
import { ALFileUpload as ALWebFileUpload } from 'al-web-components/components/file-upload';
import register from 'al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebFileUpload.el, ALWebFileUpload],
  suffix: PackageJson.version
});

export const ALFileUpload = createComponent({
  react: React,
  tagName: elementMap.get(ALWebFileUpload.el),
  elementClass: ALWebFileUpload,
  events: {
    onFileUploadFileRemove: 'onFileUploadFileRemove',
    onFileUploadFileUpload: 'onFileUploadFileUpload'
  }
});
