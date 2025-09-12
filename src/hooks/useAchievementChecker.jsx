import { useCallback } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { checkBadgeUnlock } from '../components/Badges';
import { milestones } from '../helpers/milestones';
import { useUserSettings } from './useUserSettings';

export function useAchievementChecker() {
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage('unlockedBadges', []);
  const { settings } = useUserSettings();

  // Function to calculate milestone achievements
  const calculateMilestoneAchievements = useCallback((stepsData) => {
    const milestoneDays = new Map();
    let runningTotal = 0;
    let currentMilestoneIndex = 0;
    const newMilestones = [];

    for (const dayData of stepsData) {
      runningTotal += dayData.steps;

      while (currentMilestoneIndex < milestones.length && 
             runningTotal >= milestones[currentMilestoneIndex].value) {
        const milestone = milestones[currentMilestoneIndex];
        milestoneDays.set(milestone.value, dayData.formatted_date);
        
        // Add all achieved milestones (dismissal filtering handled by AchievementContext)
        newMilestones.push({
          type: 'milestone',
          value: milestone.value,
          name: `${milestone.value.toLocaleString()} Steps`,
          rarity: milestone.rarity,
          unlockDate: dayData.formatted_date
        });
        
        currentMilestoneIndex++;
      }
    }

    return { milestoneDays, newMilestones };
  }, []);

  // Main function to check for new achievements
  const checkForNewAchievements = useCallback(async (stepsData) => {
    try {
      // Get previous badge state
      const previousBadgeIds = unlockedBadges.map(b => b.id);
      
      // Check for new badges
      const cachedWeatherData = settings.enableWeather ? 
        JSON.parse(localStorage.getItem('weatherData') || '{}') : {};
      
      const currentBadges = checkBadgeUnlock(stepsData, cachedWeatherData, settings.enableWeather);
      
      // Find newly unlocked badges
      const newBadges = currentBadges.filter(badge => 
        !previousBadgeIds.includes(badge.id)
      );

      // Check for new milestones
      const { newMilestones } = calculateMilestoneAchievements(stepsData);

      // Combine all new achievements
      const allNewAchievements = [
        ...newBadges.map(badge => ({
          type: 'badge',
          id: badge.id,
          name: badge.name,
          description: badge.description,
          image: badge.image,
          unlockDate: badge.unlockDate
        })),
        ...newMilestones
      ];

      // Update stored badges if there are new ones
      if (newBadges.length > 0) {
        setUnlockedBadges(currentBadges);
      }

      // Return new achievements for AchievementContext to handle
      return allNewAchievements;
    } catch (error) {
      console.error('Error checking for new achievements:', error);
      return [];
    }
  }, [unlockedBadges, setUnlockedBadges, calculateMilestoneAchievements, settings.enableWeather]);

  return {
    checkForNewAchievements
  };
} 