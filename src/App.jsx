import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import './styles/App.css'
import DaysGrid from './components/DaysGrid';
import Achievements from './components/Achievements';
import Leaderboard from './components/Leaderboard';
import Dock from './components/Dock';
import NumberInput from './components/NumberInput';
import Stats from './components/Stats';
import SmartRouter from './components/SmartRouter';
import { AnimatePresence } from 'framer-motion';
import SettingsMenu from './components/SettingsMenu';
import Shoes from './components/Shoes';
import WalkView from './components/WalkView';
import InsertWalk from './components/InsertWalk';

// Create a QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SmartRouter>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path='/' element={<DaysGrid/>}/>
              <Route path='/month' element={<DaysGrid/>}/>
              <Route path='/achievements' element={<Achievements/>}/>
              <Route path='/leaderboard' element={<Leaderboard/>}/>
              <Route path='/input' element={<NumberInput/>}/>
              <Route path='/stats' element={<Stats/>}/>
              <Route path='/settings' element={<SettingsMenu/>}/>
              <Route path='/shoes' element={<Shoes/>}/>
              <Route path='/walkview' element={<WalkView/>}/>
              <Route path='/insert-walk' element={<InsertWalk/>}/>
            </Routes>
          </AnimatePresence>
        </SmartRouter>
        <Dock />
      </Router>
      {/* <ReactQueryDevtools/> */}
    </QueryClientProvider>
  );
}

export default App;
