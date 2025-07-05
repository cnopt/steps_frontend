import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useStepsData } from '../hooks/useStepsData';
import { milestones } from '../helpers/milestones'

import FoilPack from './FoilPack';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '@uidotdev/usehooks';
import XPBar from './XPBar';
import { checkBadgeUnlock } from '../components/Badges';
import Badges from './Badges';
import { useUserSettings } from '../hooks/useUserSettings';
import '../styles/Achievements.css'
import LoadingSpinner from './LoadingSpinner';
import PageTransition from './PageTransition';
import GlowingButton from './GlowingButton';
import VF5ProfileBorder from './VF5ProfileBorder';

const Achievements = () => {
  const [unwrappedMilestones, setUnwrappedMilestones] = useLocalStorage('unwrappedMilestones', []);
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage('unlockedBadges', []);
  const [scrollY, setScrollY] = useState(0);
  const query = useStepsData();
  const { settings } = useUserSettings();
  
  useEffect(() => {
    if (query.data) {
      // Get cached weather data from localStorage
      const cachedWeatherData = settings.enableWeather ? 
        JSON.parse(localStorage.getItem('weatherData') || '{}') : {};

      const newUnlockedBadges = checkBadgeUnlock(query.data, cachedWeatherData, settings.enableWeather);
      setUnlockedBadges(newUnlockedBadges);
    }
  }, [query.data, settings.enableWeather]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const profileDesc = document.querySelector('.profile-desc');
    if (profileDesc) {
      // Hide profile description when scrolled down 150px or more
      const shouldHide = scrollY > 50;
      profileDesc.style.opacity = shouldHide ? '0' : '0.5';
      profileDesc.style.transition = 'opacity 0.3s ease';
    }
  }, [scrollY]);

  // Only show loading for steps data
  if (query.isLoading) return <LoadingSpinner/>;
  if (query.isError) return <div>Error fetching steps data.</div>;

  //const allSteps = query.data.dev; // Steps data from API
  //const allSteps = steps.dev;
  //const allTimeTotalSteps = allSteps.reduce((acc, item) => acc + item.steps, 0);


  const calculateMilestoneDays = () => {
    const milestoneDays = new Map();
    let runningTotal = 0;
    let currentMilestoneIndex = 0;

    for (const dayData of query.data) {
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
      <div className="sticky-header">
        <XPBar/>
        <VF5ProfileBorder/>
      </div>

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
            <h3>Profile borders (<span style={{color:'gold'}}>{unlockedBadges.length}</span>)</h3>
            <Badges unlockedBadges={unlockedBadges} />
          </div>
        </div>
    </>
  );
};

export default Achievements;