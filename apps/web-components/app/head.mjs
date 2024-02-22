import { getStyles } from '@enhance/arc-plugin-styles'

const { linkTag } = getStyles
console.log("linkTag: ", linkTag)
export default function Head(state) {
  const { store = {} } = state
  // pageTitle is set in /app/preflight.mjs
  const { pageTitle = '' } = store
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${pageTitle}</title>
      ${linkTag()}
      <link rel="icon" href="/_public/favicon.ico">
      <meta name="description" content="The HTML first full stack web framework.">
      <script>window.alAutoRegistry = true;</script>
      <link rel="stylesheet" href="/_public/head.css">
      <link rel="stylesheet" href="/_public/styles.css">
    </head>
`
}
