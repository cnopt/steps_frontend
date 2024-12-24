import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/App.css'
import DaysGrid from './components/DaysGrid';

// Create a QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <DaysGrid />
      </div>
    </QueryClientProvider>
  );
}

export default App;
