import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import './styles/App.css'
import DaysGrid from './components/DaysGrid';
import Achievements from './components/Achievements';
import NavBar from './components/NavBar';
import NumberInput from './components/NumberInput';
import Stats from './components/Stats';
import PlayerHome from './components/PlayerHome';
import Compass from './components/Compass';

// Create a QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path='/' element={<PlayerHome/>}/>
          <Route path='/month' element={<DaysGrid/>}/>
          <Route path='/achievements' element={<Achievements/>}/>
          <Route path='/input' element={<NumberInput/>}/>
          <Route path='/stats' element={<Stats/>}/>
          <Route path='/compass' element={<Compass/>}/>
        </Routes>
      </Router>
      <ReactQueryDevtools/>
    </QueryClientProvider>
  );
}

export default App;
