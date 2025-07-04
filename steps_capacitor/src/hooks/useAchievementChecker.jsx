import { useState, useCallback } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { checkBadgeUnlock } from '../components/Badges';
import { milestones } from '../helpers/milestones';
import { useUserSettings } from './useUserSettings';

export function useAchievementChecker() {
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage('unlockedBadges', []);
  const [unwrappedMilestones, setUnwrappedMilestones] = useLocalStorage('unwrappedMilestones', []);
  const [dismissedMilestoneNotifications, setDismissedMilestoneNotifications] = useLocalStorage('dismissedMilestoneNotifications', []);
  const [achievementNotifications, setAchievementNotifications] = useState([]);
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
        
        // Check if this milestone is newly unlocked and notification hasn't been dismissed
        if (!unwrappedMilestones.includes(milestone.value) && 
            !dismissedMilestoneNotifications.includes(milestone.value)) {
          newMilestones.push({
            type: 'milestone',
            value: milestone.value,
            name: `${milestone.value.toLocaleString()} Steps Milestone`,
            rarity: milestone.rarity,
            unlockDate: dayData.formatted_date
          });
        }
        
        currentMilestoneIndex++;
      }
    }

    return { milestoneDays, newMilestones };
  }, [unwrappedMilestones, dismissedMilestoneNotifications]);

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

      // If there are new achievements, show notifications
      if (allNewAchievements.length > 0) {
        setAchievementNotifications(allNewAchievements);
        
        // Optional: Trigger haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }

        return allNewAchievements;
      }

      return [];
    } catch (error) {
      console.error('Error checking for new achievements:', error);
      return [];
    }
  }, [unlockedBadges, setUnlockedBadges, calculateMilestoneAchievements, settings.enableWeather]);

  // Function to clear notifications (called when user acknowledges them)
  const clearNotifications = useCallback(() => {
    // Mark any milestones in current notifications as dismissed (but not unwrapped)
    const milestoneValues = achievementNotifications
      .filter(achievement => achievement.type === 'milestone')
      .map(milestone => milestone.value);
    
    if (milestoneValues.length > 0) {
      setDismissedMilestoneNotifications(prev => 
        [...prev, ...milestoneValues.filter(value => !prev.includes(value))]
      );
    }
    
    setAchievementNotifications([]);
  }, [achievementNotifications, setDismissedMilestoneNotifications]);

  // Function to dismiss a specific notification
  const dismissNotification = useCallback((index) => {
    // If the dismissed notification is a milestone, mark it as dismissed (but not unwrapped)
    const dismissedAchievement = achievementNotifications[index];
    if (dismissedAchievement && dismissedAchievement.type === 'milestone') {
      setDismissedMilestoneNotifications(prev => 
        prev.includes(dismissedAchievement.value) ? prev : [...prev, dismissedAchievement.value]
      );
    }
    
    setAchievementNotifications(prev => prev.filter((_, i) => i !== index));
  }, [achievementNotifications, setDismissedMilestoneNotifications]);

  return {
    checkForNewAchievements,
    achievementNotifications,
    clearNotifications,
    dismissNotification,
    hasNewAchievements: achievementNotifications.length > 0
  };
} 