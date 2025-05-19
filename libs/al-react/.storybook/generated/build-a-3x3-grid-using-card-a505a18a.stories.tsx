import type { StoryObj } from '@storybook/react-webpack5';
import { ALCard } from 'al-react/src';

export default {
  title: 'Chronicle Pages/Layout/Card Grid',
  component: ALCard,
};

export const CardGrid3x3: StoryObj<typeof ALCard> = {
  render: () => (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
      <ALCard>
        <h3>Card 1</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      </ALCard>
      <ALCard>
        <h3>Card 2</h3>
        <p>Praesent commodo cursus magna, vel scelerisque nisl consectetur et.</p>  
      </ALCard>
      <ALCard>
        <h3>Card 3</h3>
        <p>Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.</p>
      </ALCard>
      <ALCard>
        <h3>Card 4</h3>
        <p>Cras mattis consectetur purus sit amet fermentum.</p>
      </ALCard>
      <ALCard>  
        <h3>Card 5</h3>
        <p>Maecenas sed diam eget risus varius blandit sit amet non magna.</p>
      </ALCard>
      <ALCard>
        <h3>Card 6</h3>  
        <p>Nullam id dolor id nibh ultricies vehicula ut id elit.</p>
      </ALCard>
      <ALCard>
        <h3>Card 7</h3>
        <p>Etiam porta sem malesuada magna mollis euismod.</p>
      </ALCard>  
      <ALCard>
        <h3>Card 8</h3>
        <p>Donec id elit non mi porta gravida at eget metus.</p>
      </ALCard>
      <ALCard>
        <h3>Card 9</h3>
        <p>Duis mollis, est non commodo luctus, nisi erat porttitor ligula.</p>
      </ALCard>
    </div>  
  ),
};