# sl-react

The React wrapper layer for the SL design system

## Running Storybook

1. Run `yarn`
2. Run `yarn start`

## How to use web components in en-react

[TODO] Solidify and elaborate on the process

1. Install the `en-web-components` package
2. Import your component into the proper `en-react` component
3. Map the web component props to the React props

If you are creating a `Button` component using the `en-web-components` `en-button`, you would write your `Button.tsx` file like this:

```tsx
import '@en-web-components/button';

export interface Props {
  /**
   * The text within the button
   */
  buttonText?: string
}

/**
 * Primary UI component for user interaction
 */
export const Button: React.FC<Props> = ({
  buttonText,
  ...other
}) => {

  return (
    <en-button className="c-button">
      {buttonText}
    <en-button>
  );
};

```

In this example, the `en-react` prop `buttonText` gets fed into the `en-web-components` `text` property at the EN button level to render the proper button text and apply the appropriate styling to that button from the `en-web-components` CSS.

[TODO] How to handle state
