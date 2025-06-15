import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import { badges } from '../helpers/badge-list';
import { format, parseISO } from 'date-fns';
import { useUserSettings } from '../hooks/useUserSettings';

export const checkBadgeUnlock = (stepsData, weatherData = {}, weatherEnabled = false) => {
  const unlockedBadges = [];
  let runningTotalSteps = 0;
  let runningRainyDaySteps = 0;
  let highestRainyDaySteps = 0;
  //console.log(weatherData)

  // Helper function to unlock a badge with full data
  const unlockBadge = (badgeId, unlockDate) => {
    const badge = badges.find(b => b.id === badgeId);
    if (badge) {
      unlockedBadges.push({
        ...badge,
        unlockDate: unlockDate
      });
    }
  };

  // Process days chronologically, tracking running totals
  for (const day of stepsData) {
    const dateStr = new Date(day.formatted_date).toISOString().split('T')[0];
    const weather = weatherEnabled ? weatherData[dateStr] : null;
    
    runningTotalSteps += day.steps;
    
    // Only process weather-specific badges if weather is enabled and we have weather data
    if (weatherEnabled && weather) {
      // rain-specific badges if it's a rainy day
      if (weather.rain > 0 && weather.weather_code === 'rain') {
        runningRainyDaySteps += day.steps;
        highestRainyDaySteps = Math.max(highestRainyDaySteps, day.steps);

        // ********************************************************
        // Rain Wizard badge (100k total steps during rainy days)
        // ********************************************************
        if (runningRainyDaySteps >= 100000 && !unlockedBadges.some(b => b.id === 8)) {
          const badge = badges.find(b => b.id === 8);
          unlockedBadges.push({
            ...badge,
            unlockDate: day.formatted_date
          });
        }

        // ********************************************************
        // Doesn't Bother Me (500kk  steps on rainy days)
        // ********************************************************
        if (runningRainyDaySteps >= 500000 && !unlockedBadges.some(b => b.id === 31)) {
          const badge = badges.find(b => b.id === 31);
          unlockedBadges.push({
            ...badge,
            unlockDate: day.formatted_date
          });
        }

        // ********************************************************
        // Rain Demon badge (20k steps during one rainy day)
        // ********************************************************
        if (day.steps >= 20000 && !unlockedBadges.some(b => b.id === 9)) {
          unlockBadge(9, day.formatted_date);
        }
      }

      // Cold weather badges
      if (weather.temperature_max <= 1) {
        // ********************************************************
        // Fuck the Cold badge (7k+ steps on a freezing day)
        // ********************************************************
        if (day.steps > 7000 && !unlockedBadges.some(b => b.id === 19)) {
          unlockBadge(19, day.formatted_date);
        }

        // ********************************************************
        // Pussy badge (less than 2k steps on a freezing day)
        // ********************************************************
        if (day.steps < 2000 && !unlockedBadges.some(b => b.id === 41)) {
          unlockBadge(41, day.formatted_date);
        }
      }

      // Hot weather badge
      if (weather.temperature_max >= 28 && day.steps >= 10000 && !unlockedBadges.some(b => b.id === 21)) {
        unlockBadge(21, day.formatted_date);
      }

      // Snow badge
      if (weather.weather_code === 'snow' && day.steps >= 8000 && !unlockedBadges.some(b => b.id === 32)) {
        unlockBadge(32, day.formatted_date);
      }
    }

    // ********************************************************
    // Check milestones badges here as we progress through the step data
    // ********************************************************
    if (runningTotalSteps >= 500000 && !unlockedBadges.some(b => b.id === 1)) {
      unlockBadge(1, day.formatted_date);
    }
    if (runningTotalSteps >= 1000000 && !unlockedBadges.some(b => b.id === 5)) {
      unlockBadge(5, day.formatted_date);
    }
  }


  // ********************************************************
  // Marathon badge (25k steps in one day)
  // ********************************************************
  const marathonDay = stepsData.find(day => day.steps >= 25000);
  if (marathonDay) {
    unlockBadge(2, marathonDay.formatted_date);
  }


  // ********************************************************
  // Consistent walker badge (8k steps for 7 days in a row)
  // ********************************************************
  for (let i = 0; i < stepsData.length - 6; i++) {
    const sevenDays = stepsData.slice(i, i + 7);
    if (sevenDays.every(day => day.steps >= 8000)) {
      unlockBadge(3, sevenDays[6].formatted_date);
      break;
    }
  }


  // ********************************************************
  // Weekend Demon badge (20k steps in one weekend)
  // Weekend God badge (50k steps in one weekend)
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
      if (acc.currentWeekend) {
        if (acc.currentWeekend.steps >= 40000) {
          acc.fiftyKWeekends.push(acc.currentWeekend);
        } else if (acc.currentWeekend.steps >= 20000) {
          acc.twentyKWeekends.push(acc.currentWeekend);
        }
      }
      acc.currentWeekend = null;
    }
    return acc;
  }, { currentWeekend: null, twentyKWeekends: [], fiftyKWeekends: [] });

  if (weekendData.fiftyKWeekends.length > 0) {
    unlockBadge(26, weekendData.fiftyKWeekends[0].endDate);
  }

  if (weekendData.twentyKWeekends.length > 0) {
    unlockBadge(4, weekendData.twentyKWeekends[0].endDate);
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
    unlockBadge(6, seasons.unlockDate);
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
      unlockBadge(7, month.lastDate);
    }
  });


  // ********************************************************
  // Weekend Wizard badge (500k total steps on weekends)
  // ********************************************************
  let runningWeekendTotal = 0;
  let unlockDate = null;

  for (const day of stepsData) {
    const date = new Date(day.formatted_date);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend) {
      runningWeekendTotal += day.steps;
      if (runningWeekendTotal >= 500000 && !unlockDate) {
        unlockDate = day.formatted_date;
      }
    }
  }
  if (unlockDate) {
    unlockBadge(10, unlockDate);
  }


  // ********************************************************
  // 4/20 badge (4200 steps on April 20th)
  // ********************************************************
  const four20Day = stepsData.find(day => {
    const date = new Date(day.formatted_date);
    return date.getMonth() === 3 && date.getDate() === 20 && day.steps >= 4200;
  });

  if (four20Day) {
    unlockBadge(11, four20Day.formatted_date);
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
    unlockBadge(12, lazyWeekendData.lazyWeekends[0].endDate);
  }


  // ********************************************************
  // Summer Solstice badge (10k steps on 20th June)
  // ********************************************************
  const solsticeDay = stepsData.find(day => {
    const date = new Date(day.formatted_date);
    return date.getMonth() === 5 && date.getDate() === 20 && day.steps >= 10000;
  });

  if (solsticeDay) {
    unlockBadge(13, solsticeDay.formatted_date);
  }


  // ********************************************************
  // Exact Step Count badges
  //   - 1337 steps (Leet Steps)
  //   - All same digits steps (1111, 2222 etc)
  //   - Special numbers (1321)
  //   - Just missed numbers (4,999)
  // ********************************************************
  const exactStepCounts = {
    1337: { id: 14, awarded: false },
    1111: { id: 15, awarded: false },
    2222: { id: 27, awarded: false },
    3333: { id: 28, awarded: false },
    4444: { id: 29, awarded: false },
    5555: { id: 30, awarded: false },
    6666: { id: 35, awarded: false },
    7777: { id: 36, awarded: false },
    8888: { id: 37, awarded: false },
    9999: { id: 16, awarded: false },
    // 10000: { id: XX, awarded: false },
    // 20000: { id: XX, awarded: false },
    // 1321: { id: XX, awarded: false }, 
    // 999: { id: XX, awarded: false },
    // 8008: { id: XX, awarded: false },    
    // 2048: { id: XX, awarded: false },    
    // 4096: { id: XX, awarded: false },    
  };

  for (const day of stepsData) {
    if (!Object.values(exactStepCounts).every(badge => badge.awarded)) {
      const stepCount = day.steps;
      
      if (exactStepCounts[stepCount] && !exactStepCounts[stepCount].awarded) {
        unlockBadge(exactStepCounts[stepCount].id, day.formatted_date);
        exactStepCounts[stepCount].awarded = true;
      }
    } else {
      // All badges found, exit
      break;
    }
  }


  // ********************************************************
  // Deja-vu badge (same step count two days in a row)
  // ********************************************************
  const matchingDays = stepsData.find((day, index) => {
    if (index === 0) return false; // Skip first day since we need to compare with previous
    return day.steps === stepsData[index - 1].steps;
  });

  if (matchingDays) {
    unlockBadge(17, matchingDays.formatted_date);
  }


  // ********************************************************
  // Sanka ya dead badge (less than 1000 steps for 7 days in a row)
  // ********************************************************
  for (let i = 0; i < stepsData.length - 6; i++) {
    const sevenDays = stepsData.slice(i, i + 7);
    if (sevenDays.every(day => day.steps < 1000)) {
      unlockBadge(18, sevenDays[6].formatted_date);
      break;
    }
  }


  // ********************************************************
  // Consecutive Climber badge (increasing steps for 5 days)
  // ********************************************************
  for (let i = 0; i < stepsData.length - 4; i++) {
    const fiveDays = stepsData.slice(i, i + 5);
    const isConsecutiveIncrease = fiveDays.every((day, index) => {
      if (index === 0) return true;
      return day.steps > fiveDays[index - 1].steps;
    });

    if (isConsecutiveIncrease) {
      unlockBadge(20, fiveDays[4].formatted_date);
      break;
    }
  }


  // ********************************************************
  // Fuck Me It's Hot badge (10k steps on a hot day)
  // ********************************************************
  const heatWaveDay = stepsData.find(day => {
    const dateStr = new Date(day.formatted_date).toISOString().split('T')[0];
    const weather = weatherData[dateStr];
    
    return weather && 
           weather.temperature_max >= 28 && 
           day.steps >= 10000;
  });

  if (heatWaveDay) {
    unlockBadge(21, heatWaveDay.formatted_date);
  }


  // ********************************************************
  // Distance Badges
  //   - Marathon (42.2km)
  //   - half Marathon (21.1km)
  //   - 100 miles
  //   - 200 miles
  //   - 500 miles
  // ********************************************************
  const height = 170;
  const stride_length = (height * 0.42) / 100; // convert to meters
  
  const distanceMilestones = {
    21100: { id: 22, name: 'Half Marathon', awarded: false },  // 21.1km in meters
    42200: { id: 23, name: 'Marathon', awarded: false },       // 42.2km in meters
    160934: { id: 24, name: '100 Miles', awarded:false },  
    321869: { id: 25, name: '200 Miles', awarded:false },  
    804670: { id: 40, name: '500 Miles', awarded:false }  
  };

  let totalDistance = 0;
  for (const day of stepsData) {
    if (!Object.values(distanceMilestones).every(milestone => milestone.awarded)) {
      const dailyDistance = day.steps * stride_length;
      totalDistance += dailyDistance;
      
      for (const [distance, milestone] of Object.entries(distanceMilestones)) {
        if (!milestone.awarded && totalDistance >= parseInt(distance)) {
          unlockBadge(milestone.id, day.formatted_date);
          milestone.awarded = true;
        }
      }
    } else {
      // exit
      break;
    }
  }


  // ********************************************************
  // White Blanket badge (8k+ steps on a snowy day)
  // ********************************************************
  const snowDayWalk = stepsData.find(day => {
    const dateStr = new Date(day.formatted_date).toISOString().split('T')[0];
    const weather = weatherData[dateStr];
    
    return weather && 
           weather.weather_code === 'snow' && 
           day.steps >= 8000;
  });

  if (snowDayWalk) {
    unlockBadge(32, snowDayWalk.formatted_date);
  }


  // ********************************************************
  // Ramping Up badge (3 months where steps increased every month)
  // ********************************************************
  const monthlyTotals = stepsData.reduce((acc, day) => {
    const date = new Date(day.formatted_date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        steps: 0,
        lastDate: day.formatted_date,
        month: date.getMonth(),
        year: date.getFullYear()
      };
    }
    
    acc[monthKey].steps += day.steps;
    acc[monthKey].lastDate = day.formatted_date;
    return acc;
  }, {});

  // convert to array and sort chronologically
  const monthlyArray = Object.values(monthlyTotals)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  // Check for 3 consecutive increasing months
  for (let i = 0; i < monthlyArray.length - 2; i++) {
    if (monthlyArray[i].steps < monthlyArray[i + 1].steps && 
        monthlyArray[i + 1].steps < monthlyArray[i + 2].steps) {
      unlockBadge(33, monthlyArray[i + 2].lastDate);
      break;
    }
  }

  // ********************************************************
  // Still Going badge (6 months where steps increased every month)
  // ********************************************************
  for (let i = 0; i < monthlyArray.length - 5; i++) {
    if (monthlyArray[i].steps < monthlyArray[i + 1].steps && 
        monthlyArray[i + 1].steps < monthlyArray[i + 2].steps &&
        monthlyArray[i + 2].steps < monthlyArray[i + 3].steps &&
        monthlyArray[i + 3].steps < monthlyArray[i + 4].steps &&
        monthlyArray[i + 4].steps < monthlyArray[i + 5].steps) {
      unlockBadge(34, monthlyArray[i + 5].lastDate);
      break;
    }
  }

  // ********************************************************
  //  Just The Cold Init (100k + 500k total steps in cold weather)
  // ********************************************************
  let coldWeatherSteps = 0;
  let coldWeather100kDate = null;
  let coldWeather500kDate = null;

  for (const day of stepsData) {
    const dateStr = new Date(day.formatted_date).toISOString().split('T')[0];
    const weather = weatherData[dateStr];
    
    if (weather && weather.temperature_max <= 3) {
      coldWeatherSteps += day.steps;
      
      if (coldWeatherSteps >= 500000 && !coldWeather500kDate) {
        coldWeather500kDate = day.formatted_date;
      }
      else if (coldWeatherSteps >= 100000 && !coldWeather100kDate) {
        coldWeather100kDate = day.formatted_date;
      }
    }
  }

  if (coldWeather100kDate) {
    unlockBadge(38, coldWeather100kDate);
  }

  if (coldWeather500kDate) {
    unlockBadge(39, coldWeather500kDate);
  }


  // ********************************************************
  // Pussy badge (less than 2k steps on a freezing day)
  // ********************************************************
  const coldAvoidanceDay = stepsData.find(day => {
    const dateStr = new Date(day.formatted_date).toISOString().split('T')[0];
    const weather = weatherData[dateStr];
    return weather && 
          weather.temperature_max <= 1 && 
          day.steps < 2000;
  });

  if (coldAvoidanceDay) {
    unlockBadge(41, coldAvoidanceDay.formatted_date)
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
  const { settings } = useUserSettings();
  const lockedBadgeImage = '/locked.png';

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
          const isWeatherDependent = badge.requiresWeather;
          const isWeatherDisabled = isWeatherDependent && !settings.enableWeather;
          
          return (
            <motion.div 
              key={badge.id}
              className={`badge-item ${isUnlocked ? 'unlocked' : 'locked'} ${isWeatherDisabled ? 'weather-disabled' : ''}`}
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
                className={`badge-img ${isNew ? 'new' : ''} ${isWeatherDependent ? 'weather-dependent' : ''}`}
                whileHover={isUnlocked ? { scale: 1.1 } : { scale: 1.0 }}
              >
                <img src={isUnlocked ? badge.image : lockedBadgeImage} alt={badge.name} />
                {isWeatherDependent && (
                  <div className="weather-indicator" title={settings.enableWeather ? 'Weather-dependent badge' : 'Enable weather to unlock'}>
                    ⛅
                  </div>
                )}
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
                  {selectedBadge.requiresWeather && (
                    <div className="weather-indicator modal" title="Weather-dependent badge">
                      ⛅
                    </div>
                  )}
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