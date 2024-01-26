declare module '*.scss';
declare module '*.css';
declare module '*.ttf';

/* This is needed to be able to import SVGs directly into Storybook */
declare module '*.svg' {
  const content: any;
  export default content;
}