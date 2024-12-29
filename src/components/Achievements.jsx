import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import '../styles/Achievements.css'
import NavBar from './NavBar';
import FoilPack from './FoilPack';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '@uidotdev/usehooks';
import XPBar from './XPBar';




const fetchStepsData = async () => {
  const response = await axios.get('https://yxa.gr/steps/allstepsdata');
  return response.data;
};

const Achievements = () => {
  const [unwrappedMilestones, setUnwrappedMilestones] = useLocalStorage('unwrappedMilestones', []);

  const query = useQuery({
    queryKey: ['stepsData'],
    queryFn: fetchStepsData,
  });

  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error fetching data.</div>;

  const allSteps = query.data.dev; // Steps data from API
  //const allSteps = steps.dev;

  const allTimeTotalSteps = allSteps.reduce((acc, item) => acc + item.steps, 0);

  const milestones = [
    { value: 100000, rarity: 'common' },
    { value: 250000, rarity: 'common' },
    { value: 300000, rarity: 'common' },
    { value: 400000, rarity: 'common' },
    { value: 500000, rarity: 'rare' },
    { value: 600000, rarity: 'uncommon' },
    { value: 700000, rarity: 'uncommon' },
    { value: 800000, rarity: 'uncommon' },
    { value: 900000, rarity: 'uncommon' },
    { value: 1000000, rarity: 'rare' },
    { value: 1100000, rarity: 'uncommon' },
    { value: 1200000, rarity: 'uncommon' },
    { value: 1300000, rarity: 'uncommon' },
    { value: 1400000, rarity: 'uncommon' },
    { value: 1500000, rarity: 'rare' },
    { value: 1600000, rarity: 'uncommon' },
    { value: 1700000, rarity: 'uncommon' },
    { value: 1800000, rarity: 'uncommon' },
    { value: 1900000, rarity: 'uncommon' },
    { value: 2000000, rarity: 'rare' },
  ];

  const calculateMilestoneDays = () => {
    const sortedSteps = [...query.data.dev].sort(
      (a, b) => new Date(a.formatted_date) - new Date(b.formatted_date)
    );

    const milestoneDays = new Map();
    let runningTotal = 0;
    let currentMilestoneIndex = 0;

    for (const dayData of sortedSteps) {
      runningTotal += dayData.steps;

      while (currentMilestoneIndex < milestones.length && 
             runningTotal >= milestones[currentMilestoneIndex].value) {
        milestoneDays.set(
          milestones[currentMilestoneIndex].value,
          dayData.formatted_date
        );
        currentMilestoneIndex++;
      }
    }

    return { milestoneDays, lastAchievedIndex: currentMilestoneIndex - 1 };
  };

  const { milestoneDays, lastAchievedIndex } = calculateMilestoneDays();

  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    return format(date, 'do MMMM yyyy');
  };

  const handleUnwrap = (milestone) => {
    if (!unwrappedMilestones.includes(milestone)) {
      setUnwrappedMilestones([...unwrappedMilestones, milestone]);
    }
  };

  return (
    <>
      <NavBar/>
      <XPBar/>
      <div className="achievements-container">
        
        <h3>Unlocked (<span style={{color:'gold'}}>{milestoneDays.size}</span>)</h3>
        {/* Achieved Milestones */}
        <div className="milestones-done-section">
          
          {milestones.slice(0, lastAchievedIndex + 1).reverse().map((milestone) => (
            <AnimatePresence key={milestone.value}>
              {unwrappedMilestones.includes(milestone.value) ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`milestone-item achieved ${milestone.rarity}`}
                >
                  <span className="milestone-value">
                    <span className="milestone-star">󰄵</span>
                    {milestone.value.toLocaleString()} steps
                  </span>
                  <span className="milestone-date">
                    Unlocked: <br/>
                    {formatDate(milestoneDays.get(milestone.value))}
                  </span>
                </motion.div>
              ) : (
                <FoilPack
                  milestone={milestone}
                  onUnwrap={() => handleUnwrap(milestone.value)}
                />
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* Upcoming Milestones */}
        <div className="milestones-section upcoming">
          <h3>Locked ({milestones.length-milestoneDays.size})</h3>
          {milestones.slice(lastAchievedIndex + 1).map((milestone) => (
            <div key={milestone.value} className="milestone-item upcoming">
              <span className="milestone-value">
                <span className="milestone-star">☐</span>
                {milestone.value.toLocaleString()} steps
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Achievements;