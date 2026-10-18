import '../src/index.css';
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'Studio canvas',
      values: [
        { name: 'Studio canvas', value: '#e7e9f6' },
        { name: 'Paper', value: '#ffffff' },
        { name: 'Trade surface', value: '#f3f5f2' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default preview;
