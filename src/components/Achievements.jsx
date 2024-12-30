import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useStepsData } from '../hooks/useStepsData';
import { milestones } from '../helpers/milestones'
import NavBar from './NavBar';
import FoilPack from './FoilPack';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '@uidotdev/usehooks';
import XPBar from './XPBar';
import { checkBadgeUnlock } from '../helpers/badges';
import Badges from './Badges';
import '../styles/Achievements.css'



const Achievements = () => {
  const [unwrappedMilestones, setUnwrappedMilestones] = useLocalStorage('unwrappedMilestones', []);
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage('unlockedBadges', []);
  const query = useStepsData();

  useEffect(() => {
    if (query.data) {
      const newUnlockedBadges = checkBadgeUnlock(query.data.dev);
      setUnlockedBadges(newUnlockedBadges);
    }
  }, [query.data]);

  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error fetching data.</div>;

  //const allSteps = query.data.dev; // Steps data from API
  //const allSteps = steps.dev;
  //const allTimeTotalSteps = allSteps.reduce((acc, item) => acc + item.steps, 0);


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
        
        <h3>Milestone cards (<span style={{color:'gold'}}>{milestoneDays.size}</span>)</h3>
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
                    <span className="milestone-star">󰄵</span> <br/>
                    {milestone.value.toLocaleString()} <br/> steps
                  </span>
                  <span className="milestone-date">
                    {format(parseISO(milestoneDays.get(milestone.value)), 'do MMM yyyy')}
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
        {/* <div className="milestones-section upcoming">
          <h3>Locked ({milestones.length-milestoneDays.size})</h3>
          {milestones.slice(lastAchievedIndex + 1).map((milestone) => (
            <div key={milestone.value} className="milestone-item upcoming">
              <span className="milestone-value">
                <span className="milestone-star">☐</span>
                {milestone.value.toLocaleString()} steps
              </span>
            </div>
          ))}
        </div> */}

        <div className="badges-section">
          <h3>Badges (<span style={{color:'gold'}}>{unlockedBadges.length}</span>)</h3>
          <Badges unlockedBadges={unlockedBadges} />
        </div>
      </div>
    </>
  );
};

export default Achievements;