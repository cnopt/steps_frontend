import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useStepsData } from '../hooks/useStepsData';
import { useAchievementChecker } from '../hooks/useAchievementChecker';

const AchievementContext = createContext();

export const useAchievementContext = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievementContext must be used within an AchievementProvider');
  }
  return context;
};

export const AchievementProvider = ({ children }) => {
  const [pendingAchievements, setPendingAchievements] = useLocalStorage('pendingAchievements', []);
  const [lastCheckedDataHash, setLastCheckedDataHash] = useLocalStorage('lastCheckedDataHash', '');
  const [dismissedAchievements, setDismissedAchievements] = useLocalStorage('dismissedAchievements', []);
  
  const { data: stepsData, isSuccess: stepsDataLoaded } = useStepsData();
  const { checkForNewAchievements } = useAchievementChecker();

  // Create a simple hash of steps data to detect changes
  const createDataHash = useCallback((data) => {
    if (!data || !Array.isArray(data)) return '';
    return data.map(d => `${d.formatted_date}:${d.steps}`).join('|');
  }, []);

  // Check for new achievements when steps data changes
  useEffect(() => {
    if (!stepsDataLoaded || !stepsData) return;

    const currentHash = createDataHash(stepsData);
    
    // Only check if data has actually changed
    if (currentHash !== lastCheckedDataHash) {
      console.log('[ACHIEVEMENT CONTEXT] Steps data changed, checking for new achievements...');
      
      const checkAchievements = async () => {
        try {
          const newAchievements = await checkForNewAchievements(stepsData);
          
          if (newAchievements && newAchievements.length > 0) {
            console.log('[ACHIEVEMENT CONTEXT] Found new achievements:', newAchievements);
            
            // Add to pending achievements (avoiding duplicates and dismissed achievements)
            setPendingAchievements(prev => {
              const existingIds = prev.map(a => `${a.type}-${a.id || a.value}`);
              const newOnes = newAchievements.filter(a => {
                const achievementId = `${a.type}-${a.id || a.value}`;
                return !existingIds.includes(achievementId) && 
                       !dismissedAchievements.includes(achievementId);
              });
              return [...prev, ...newOnes];
            });
          }
          
          // Update hash to prevent unnecessary rechecking
          setLastCheckedDataHash(currentHash);
        } catch (error) {
          console.error('[ACHIEVEMENT CONTEXT] Error checking achievements:', error);
        }
      };

      // Debounce achievement checking to avoid rapid successive calls
      const timeoutId = setTimeout(checkAchievements, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [stepsData, stepsDataLoaded, lastCheckedDataHash, checkForNewAchievements, setLastCheckedDataHash, setPendingAchievements, createDataHash, dismissedAchievements]);

  const dismissAchievement = useCallback((achievementIndex) => {
    // Get the achievement being dismissed to track it
    const achievementToDismiss = pendingAchievements[achievementIndex];
    if (achievementToDismiss) {
      const achievementId = `${achievementToDismiss.type}-${achievementToDismiss.id || achievementToDismiss.value}`;
      
      // Add to dismissed achievements list
      setDismissedAchievements(prev => 
        prev.includes(achievementId) ? prev : [...prev, achievementId]
      );
    }
    
    // Remove from pending achievements
    setPendingAchievements(prev => prev.filter((_, index) => index !== achievementIndex));
  }, [pendingAchievements, setPendingAchievements, setDismissedAchievements]);

  const dismissAllAchievements = useCallback(() => {
    // Track all achievements being dismissed
    pendingAchievements.forEach(achievement => {
      const achievementId = `${achievement.type}-${achievement.id || achievement.value}`;
      setDismissedAchievements(prev => 
        prev.includes(achievementId) ? prev : [...prev, achievementId]
      );
    });
    
    // Clear all pending achievements
    setPendingAchievements([]);
  }, [pendingAchievements, setPendingAchievements, setDismissedAchievements]);

  const value = {
    pendingAchievements,
    hasPendingAchievements: pendingAchievements.length > 0,
    dismissAchievement,
    dismissAllAchievements
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
};
