export const badges = [
    {
      id: 1,
      name: "5 Hundo",
      description: "Complete 500,000 steps",
      image: '../src/assets/badges/badge-500k.png',
      unlockDate: null,
    },
    {
      id: 2,
      name: "Marathon Runner",
      description: "Complete 25,000 steps in a single day",
      image: '../src/assets/badges/badge-500k.png',
      unlockDate: null,
    },
    {
      id: 3,
      name: "Consistent MF",
      description: "Walk at least 8,000 steps for 7 days in a row",
      image: '../src/assets/badges/badge-500k.png',
      unlockDate: null,
    },
    {
      id: 5,
      name: "Weekend Demon",
      description: "Complete 20,000 steps over a weekend",
      image: '../src/assets/badges/badge-500k.png',
      unlockDate: null,
    },
    {
        id: 6,
        name: "One Million",
        description: "Complete 1,000,000 steps",
        image: '../src/assets/badges/badge-500k.png',
        unlockDate: null,
    },
    {
        id: 7,
        name: "Four Seasons",
        description: "Log steps in all four seasons of the year",
        image: '../src/assets/badges/badge-500k.png',
        unlockDate: null,
    },
    {
        id: 8,
        name: "Month Demon",
        description: "Log 300,000 steps in a single month",
        image: '../src/assets/badges/badge-500k.png',
        unlockDate: null,
    },
  ];
  
  export const checkBadgeUnlock = (stepsData) => {
    const unlockedBadges = [];
    
    // Helper function to get steps for a specific date
    const getStepsForDate = (date) => {
      const dayData = stepsData.find(day => day.formatted_date === date);
      return dayData ? dayData.steps : 0;
    };

    // Calculate total steps
    const totalSteps = stepsData.reduce((sum, day) => sum + day.steps, 0);
    
    // Modified unlock checks to include dates
    if (totalSteps >= 500000) {
      // Find the date when this milestone was reached
      let runningTotal = 0;
      let unlockDate = null;
      for (const day of stepsData) {
        runningTotal += day.steps;
        if (runningTotal >= 500000) {
          unlockDate = day.formatted_date;
          break;
        }
      }
      unlockedBadges.push({ id: 1, unlockDate });
    }
    if (totalSteps >= 1000000) {
        // Find the date when this milestone was reached
        let runningTotal = 0;
        let unlockDate = null;
        for (const day of stepsData) {
          runningTotal += day.steps;
          if (runningTotal >= 1000000) {
            unlockDate = day.formatted_date;
            break;
          }
        }
        unlockedBadges.push({ id: 6, unlockDate });
      }

    // Check Marathon Runner badge (25k in one day)
    const marathonDay = stepsData.find(day => day.steps >= 25000);
    if (marathonDay) {
      unlockedBadges.push({ id: 2, unlockDate: marathonDay.formatted_date });
    }

    // Check Consistent Walker badge (8k+ for 7 consecutive days)
    for (let i = 0; i < stepsData.length - 6; i++) {
      const sevenDays = stepsData.slice(i, i + 7);
      if (sevenDays.every(day => day.steps >= 8000)) {
        unlockedBadges.push({ id: 3, unlockDate: sevenDays[6].formatted_date });
        break;
      }
    }

    // Weekend Warrior badge
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
        id: 5, 
        unlockDate: weekendData.achievedWeekends[0].endDate 
      });
    }

    // Check Monthly Master badge (300,000 steps in a single month)
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

    // Check if any month reached 300,000 steps
    Object.values(monthlySteps).forEach(month => {
      if (month.steps >= 300000) {
        unlockedBadges.push({
          id: 10,
          unlockDate: month.lastDate
        });
      }
    });

    // Check Four Seasons badge
    const seasons = stepsData.reduce((acc, day) => {
      const date = new Date(day.formatted_date);
      const month = date.getMonth();
      
      // Determine season (Northern Hemisphere)
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
        id: 12,
        unlockDate: seasons.unlockDate
      });
    }

    return unlockedBadges;
  };