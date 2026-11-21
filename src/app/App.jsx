import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { AiModeProvider } from './AiModeContext';
import AppRouter from './router';

import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Reducimos staleTime para datos de tracking
      staleTime: 30 * 1000, 
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors closeButton />
      <AuthProvider>
        <AiModeProvider>
          <AppRouter />
        </AiModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
