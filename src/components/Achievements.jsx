import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useStepsData } from '../hooks/useStepsData';
import { milestones } from '../helpers/milestones'
import { useAchievementContext } from '../contexts/AchievementContext';
import localDataService from '../services/localDataService';

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
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage('unlockedBadges', []);
  const [userSelectedMilestoneValue, setUserSelectedMilestoneValue] = useState(() => {
    return localDataService.getUserSelectedMilestone();
  });
  const query = useStepsData();
  const { settings } = useUserSettings();
  const { pendingAchievements, dismissAchievement, dismissAllAchievements } = useAchievementContext();
  
  useEffect(() => {
    if (query.data) {
      // Get cached weather data from localStorage
      const cachedWeatherData = settings.enableWeather ? 
        JSON.parse(localStorage.getItem('weatherData') || '{}') : {};

      const newUnlockedBadges = checkBadgeUnlock(query.data, cachedWeatherData, settings.enableWeather);
      setUnlockedBadges(newUnlockedBadges);
    }
  }, [query.data, settings.enableWeather]);

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


  const handleMilestoneSelection = (milestone) => {
    try {
      // Save selected milestone to localStorage
      const result = localDataService.setUserSelectedMilestone(milestone);
      
      if (result.success) {
        setUserSelectedMilestoneValue(result.selectedMilestoneValue);
      }
    } catch (error) {
      console.error('Error selecting milestone:', error);
    }
  };

  const getAchievementIcon = (type) => {
    switch (type) {
      case 'badge': return '🏆';
      case 'milestone': return '󰖃';
      default: return '🎉';
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return '#94a3b8';
      case 'uncommon': return '#fbbf24';
      case 'rare': return '#8b5cf6';
      default: return '#fbbf24';
    }
  };

  return (
    <>
      <div className="sticky-header">
        <XPBar/>
        <VF5ProfileBorder/>
      </div>

        <div className="achievements-container">
          
          {/* Pending Achievements Section */}
          {pendingAchievements.length > 0 && (
            <div className="pending-achievements-section">
              <div className="pending-achievements-header">
                <p><span>󰝧</span> New Unlocks</p>
              </div>
              
              <div className="pending-achievements-list">
                  {pendingAchievements.map((achievement, index) => (
                    <div
                      key={`${achievement.type}-${achievement.id || achievement.value}-${index}`}
                      className={`pending-achievement-item ${achievement.type}`}
                    >
                      <div className="achievement-icon">
                        {achievement.image ? (
                          <img 
                            src={achievement.image} 
                            alt={achievement.name}
                            className="achievement-image"
                          />
                        ) : (
                          <span className={`achievement-emoji ${achievement.rarity || ''}`}>
                            {getAchievementIcon(achievement.type)}
                          </span>
                        )}
                      </div>
                      
                      <div className="achievement-details">
                        <div className="achievement-name">{achievement.name}</div>
                        {achievement.description && (
                          <div className="achievement-description">
                            {achievement.description}
                          </div>
                        )}
                        <div className="achievement-date">
                          Unlocked {format(parseISO(achievement.unlockDate), 'MMM do, yyyy')}
                        </div>
                      </div>

                      <div className="achievement-actions">
                        <button 
                          className="dismiss-btn"
                          onClick={() => dismissAchievement(index)}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          <h3>Titles</h3>
          {/* Achieved Milestones */}
          <div className="milestones-section">
            {milestones.map((milestone) => {
              const isAchieved = milestone.value <= (milestones[lastAchievedIndex]?.value || 0);
              
              return isAchieved ? (
                <div 
                  className={`milestone-item achieved ${milestone.rarity} ${userSelectedMilestoneValue === milestone.value ? 'user-selected' : ''}`}
                  onClick={() => handleMilestoneSelection(milestone)}
                  style={{ cursor: 'pointer' }}
                >
                  <p className="milestone-value">
                    <span className="milestone-star">󰖃</span>
                    {milestone.value.toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="milestone-item locked">
                  <p className="milestone-value" aria-hidden="true">
                    <span className="milestone-star"></span>
                    {/* Empty placeholder to maintain spacing */}
                    0
                  </p>
                </div>
              );
            })}
          </div>

          <div className="badges-section">
            <h3>Emblems</h3>
            <Badges unlockedBadges={unlockedBadges} />
          </div>
        </div>
    </>
  );
};

export default Achievements;