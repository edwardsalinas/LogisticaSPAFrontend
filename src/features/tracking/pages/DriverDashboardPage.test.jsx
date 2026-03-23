import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DriverDashboardPage from './DriverDashboardPage';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  })),
}));

const queryClient = new QueryClient();

describe('DriverDashboardPage', () => {
  it('renders correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DriverDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/Itinerario de Viajes/i)).toBeInTheDocument();
  });
});
