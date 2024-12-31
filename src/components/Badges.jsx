import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import { badges } from '../helpers/badge-list';
import { format, parseISO } from 'date-fns';

export const checkBadgeUnlock = (stepsData, weatherData = {}) => {
  const unlockedBadges = [];
  let runningTotalSteps = 0;
  let runningRainyDaySteps = 0;
  let highestRainyDaySteps = 0;

  // Process days chronologically, tracking running totals
  for (const day of stepsData) {
    const dateStr = new Date(day.formatted_date).toISOString().split('T')[0];
    const weather = weatherData[dateStr];
    
    runningTotalSteps += day.steps;
    
    // rain-specific badges if it's a rainy day
    if (weather && weather.rain > 0 && weather.weather_code === 'rain') {
      runningRainyDaySteps += day.steps;
      highestRainyDaySteps = Math.max(highestRainyDaySteps, day.steps);

      // ********************************************************
      // Rain Wizard badge (100k total steps during rainy days)
      // ********************************************************
      if (runningRainyDaySteps >= 100000 && !unlockedBadges.some(b => b.id === 8)) {
        unlockedBadges.push({
          id: 8,
          name: badges.find(b => b.id === 8).name,
          unlockDate: day.formatted_date
        });
      }

      // ********************************************************
      // Rain Demon badge (10k  steps during one rainy day)
      // ********************************************************
      if (day.steps >= 10000 && !unlockedBadges.some(b => b.id === 9)) {
        unlockedBadges.push({
          id: 9,
          name: badges.find(b => b.id === 9).name,
          unlockDate: day.formatted_date
        });
      }
    }


    // ********************************************************
    // Check milestones badges here as we progress through the step data
    // ********************************************************
    if (runningTotalSteps >= 500000 && !unlockedBadges.some(b => b.id === 1)) {
      unlockedBadges.push({ 
        id: 1, 
        name: badges.find(b => b.id === 1).name, 
        unlockDate: day.formatted_date 
      });
    }
    if (runningTotalSteps >= 1000000 && !unlockedBadges.some(b => b.id === 5)) {
      unlockedBadges.push({ 
        id: 5, 
        name: badges.find(b => b.id === 5).name, 
        unlockDate: day.formatted_date 
      });
    }
  }


  // ********************************************************
  // Marathon badge (25k steps in one day)
  // ********************************************************
  const marathonDay = stepsData.find(day => day.steps >= 25000);
  if (marathonDay) {
    unlockedBadges.push({ 
      id: 2, 
      name: badges.find(b => b.id === 2).name, 
      unlockDate: marathonDay.formatted_date 
    });
  }


  // ********************************************************
  // Consistent walker badge (8k steps for 7 days in a row)
  // ********************************************************
  for (let i = 0; i < stepsData.length - 6; i++) {
    const sevenDays = stepsData.slice(i, i + 7);
    if (sevenDays.every(day => day.steps >= 8000)) {
      unlockedBadges.push({ 
        id: 3, 
        name: badges.find(b => b.id === 3).name, 
        unlockDate: sevenDays[6].formatted_date 
      });
      break;
    }
  }


  // ********************************************************
  // Weekend Demon badge (20k steps in one weekend)
  // ********************************************************
  const weekendData = stepsData.reduce((acc, day) => {
    const date = new Date(day.formatted_date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend) {
      if (!acc.currentWeekend) {
        acc.currentWeekend = { steps: 0, endDate: day.formatted_date };
      }
      acc.currentWeekend.steps += day.steps;
      acc.currentWeekend.endDate = day.formatted_date;
    } else {
      if (acc.currentWeekend && acc.currentWeekend.steps >= 20000) {
        acc.achievedWeekends.push(acc.currentWeekend);
      }
      acc.currentWeekend = null;
    }
    return acc;
  }, { currentWeekend: null, achievedWeekends: [] });

  if (weekendData.achievedWeekends.length > 0) {
    unlockedBadges.push({ 
      id: 4,
      name: badges.find(b => b.id === 4).name,
      unlockDate: weekendData.achievedWeekends[0].endDate 
    });
  }


  // ********************************************************
  // Four Seasons badge
  // ********************************************************
  const seasons = stepsData.reduce((acc, day) => {
    const date = new Date(day.formatted_date);
    const month = date.getMonth();
    
    let season;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';

    if (!acc.seasons.has(season)) {
      acc.seasons.add(season);
      if (acc.seasons.size === 4) {
        acc.unlockDate = day.formatted_date;
      }
    }
    return acc;
  }, { seasons: new Set(), unlockDate: null });

  if (seasons.seasons.size === 4) {
    unlockedBadges.push({
      id: 6,
      name: badges.find(b => b.id === 6).name,
      unlockDate: seasons.unlockDate
    });
  }


  // ********************************************************
  // Month Demon badge (300k steps in one month)
  // ********************************************************
  const monthlySteps = stepsData.reduce((acc, day) => {
    const date = new Date(day.formatted_date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        steps: 0,
        lastDate: day.formatted_date
      };
    }
    
    acc[monthKey].steps += day.steps;
    acc[monthKey].lastDate = day.formatted_date;
    return acc;
  }, {});

  Object.values(monthlySteps).forEach(month => {
    if (month.steps >= 300000) {
      unlockedBadges.push({
        id: 7,
        name: badges.find(b => b.id === 7).name,
        unlockDate: month.lastDate
      });
    }
  });


  // ********************************************************
  // Weekend Wizard badge (500k total steps on weekends)
  // ********************************************************
  const weekendTotalSteps = stepsData.reduce((total, day) => {
    const date = new Date(day.formatted_date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return isWeekend ? total + day.steps : total;
  }, 0);

  if (weekendTotalSteps >= 500000) {
    unlockedBadges.push({
      id: 10,
      name: badges.find(b => b.id === 10).name,
      unlockDate: stepsData[stepsData.length - 1].formatted_date // Use the latest date as unlock date
    });
  }


  // ********************************************************
  // 4/20 badge (4200 steps on April 20th)
  // ********************************************************
  const four20Day = stepsData.find(day => {
    const date = new Date(day.formatted_date);
    return date.getMonth() === 3 && date.getDate() === 20 && day.steps >= 4200;
  });

  if (four20Day) {
    unlockedBadges.push({
      id: 11,
      name: badges.find(b => b.id === 11).name,
      unlockDate: four20Day.formatted_date
    });
  }


  // ********************************************************
  // Lazy Weekend badge (less than 5k steps in one weekend)
  // ********************************************************
  const lazyWeekendData = stepsData.reduce((acc, day) => {
    const date = new Date(day.formatted_date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    if (isWeekend) {
      if (!acc.currentWeekend) {
        acc.currentWeekend = { steps: 0, endDate: day.formatted_date };
      }
      acc.currentWeekend.steps += day.steps;
      acc.currentWeekend.endDate = day.formatted_date;
    } else {
      if (acc.currentWeekend && acc.currentWeekend.steps < 5000) {
        acc.lazyWeekends.push(acc.currentWeekend);
      }
      acc.currentWeekend = null;
    }
    return acc;
  }, { currentWeekend: null, lazyWeekends: [] });

  if (lazyWeekendData.lazyWeekends.length > 0) {
    unlockedBadges.push({
      id: 12,
      name: badges.find(b => b.id === 12).name,
      unlockDate: lazyWeekendData.lazyWeekends[0].endDate
    });
  }


  // ********************************************************
  // Summer Solstice badge (10k steps on 20th June)
  // ********************************************************
  const solsticeDay = stepsData.find(day => {
    const date = new Date(day.formatted_date);
    return date.getMonth() === 5 && date.getDate() === 20 && day.steps >= 10000;
  });

  if (solsticeDay) {
    unlockedBadges.push({
      id: 13,
      name: badges.find(b => b.id === 13).name,
      unlockDate: solsticeDay.formatted_date
    });
  }


  
  return unlockedBadges;
};



const Badges = ({ unlockedBadges }) => {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [viewedBadges, setViewedBadges] = useState(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem('viewedBadges');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const lockedBadgeImage = '../src/assets/badges/locked.png';

  const [{ rotateY }, api] = useSpring(() => ({
    rotateY: 0,
    config: { mass: 1, tension: 150, friction: 26 }
  }));

  const bindDrag = useDrag(({ movement: [mx], down }) => {
    api.start({
      rotateY: down ? mx : 0,
      immediate: down
    });
  }, {
    pointer: { touch: true }
  });


  const handleBadgeClick = (badge, unlockedInfo) => {
    if (unlockedInfo) {
      setSelectedBadge({ ...badge, unlockDate: unlockedInfo.unlockDate });
      
      // Mark badge as viewed
      if (!viewedBadges.has(badge.id)) {
        const newViewedBadges = new Set([...viewedBadges, badge.id]);
        setViewedBadges(newViewedBadges);
        // Store as array in localStorage since JSON can't serialize Sets
        localStorage.setItem('viewedBadges', JSON.stringify([...newViewedBadges]));
      }
    }
  };


  return (
    <>
      <motion.div 
        className='badge-container'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {badges.map((badge, index) => {
          const unlockedInfo = unlockedBadges.find(b => b.id === badge.id);
          const isUnlocked = !!unlockedInfo;
          const isNew = isUnlocked && !viewedBadges.has(badge.id);
          
          return (
            <motion.div 
              key={badge.id}
              className={`badge-item ${isUnlocked ? 'unlocked' : 'locked'}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                delay: index * 0.1,
                duration: 0.2,
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              onClick={() => handleBadgeClick(badge, unlockedInfo)}
              style={{ cursor: isUnlocked ? 'pointer' : 'default' }}
            >
              <motion.div 
                className={`badge-img ${isNew ? 'new' : ''}`}
                whileHover={isUnlocked ? { scale: 1.1 } : { scale: 1.0 }}
              >
                <img src={isUnlocked ? badge.image : lockedBadgeImage} alt={badge.name} />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {selectedBadge && (
          <>
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBadge(null)}
            />
            <div className='modal-container'>
              <motion.div
                className="modal-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <animated.div
                  {...bindDrag()}
                  style={{
                    transform: rotateY.to(r => `perspective(1000px) rotateY(${r}deg)`),
                    cursor: 'grab',
                    touchAction: 'none'
                  }}
                >
                  <img 
                    src={selectedBadge.image} 
                    alt={selectedBadge.name}
                    className="modal-badge-image"
                    draggable="false"
                  />
                </animated.div>
                <p className="modal-badge-description">{selectedBadge.description}</p>
                <p className="modal-badge-date">
                    Unlocked on:<br/>{format(parseISO(selectedBadge.unlockDate), 'do MMMM yyyy')}
                </p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Badges;