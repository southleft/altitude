import type { StoryObj } from '@storybook/react-webpack5';
import { Card } from 'your-component-library';

export default {
  title: 'Generated/Dashboard with Sections and Cards',
  component: Card,
};

export const Default: StoryObj<typeof Card> = {
  args: {
    children: (
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
        <div>
          <Card>
            <h2>Analytics</h2>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <Card>
                  <h3>Total Users</h3>
                  <p>1,234</p>
                </Card>
              </div>
              <div>
                <Card>
                  <h3>Monthly Active Users</h3>
                  <p>567</p>
                </Card>
              </div>
            </div>
          </Card>
        </div>
        <div>
          <Card>
            <h2>Sales</h2>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
              <div>
                <Card>
                  <h3>Total Revenue</h3>
                  <p>$12,345</p>
                </Card>
              </div>
              <div>
                <Card>
                  <h3>New Orders</h3>
                  <p>10</p>
                </Card>
              </div>
              <div>
                <Card>
                  <h3>Avg. Order Value</h3>
                  <p>$123.45</p>
                </Card>
              </div>
            </div>
          </Card>
          <Card>
            <h2>Marketing</h2>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <Card>
                  <h3>Leads Generated</h3>
                  <p>100</p>
                </Card>
              </div>
              <div>
                <Card>
                  <h3>Conversion Rate</h3>
                  <p>5%</p>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }
};