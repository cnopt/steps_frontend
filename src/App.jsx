import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import './styles/App.css'
import DaysGrid from './components/DaysGrid';
import Achievements from './components/Achievements';
import NavBar from './components/NavBar';
import NumberInput from './components/NumberInput';
import Stats from './components/Stats';

// Create a QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path='/' element={<NavBar/>}/>
          <Route path='/month' element={<DaysGrid/>}/>
          <Route path='/achievements' element={<Achievements/>}/>
          <Route path='/input' element={<NumberInput/>}/>
          <Route path='/stats' element={<Stats/>}/>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
