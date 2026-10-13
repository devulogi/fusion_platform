import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
    it('renders the frontend starter screen', () => {
        render(<App />);

        expect(screen.getByRole('heading', { name: 'Frontend is ready' })).toBeInTheDocument();
    });
});
