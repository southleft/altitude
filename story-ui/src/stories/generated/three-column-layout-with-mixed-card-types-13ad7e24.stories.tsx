import type { StoryObj } from '@storybook/react-webpack5';
import { Card, ImageCard, ProfileCard } from 'your-component-library';

export default {
  title: 'Generated/Three-Column Layout with Mixed Card Types',
  component: Card,
};

export const Default: StoryObj<typeof Card> = {
  args: {
    children: (
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
        <div>
          <Card>
            <h3>Standard Card</h3>
            <p>This is a standard card component with a title and some text content.</p>
          </Card>
        </div>
        <div>
          <ImageCard 
            title="Image Card"
            description="This is an image card component with a title, description and image."
            imageUrl="https://example.com/sample-image.jpg"
            imageAlt="Sample image"
          />
        </div>
        <div>
          <ProfileCard
            name="John Smith"
            title="Software Engineer" 
            description="John is an experienced full stack developer."
            avatarUrl="https://example.com/profile-pic.jpg"
          />
        </div>
      </div>
    )
  }
};