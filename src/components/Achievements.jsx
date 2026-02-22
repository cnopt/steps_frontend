import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { useStepsData } from '../hooks/useStepsData';
import { milestones } from '../helpers/milestones'
import { useAchievementContext } from '../contexts/AchievementContext';
import { badges } from '../helpers/badge-list';
import {
  DEFAULT_EMBLEM_BADGE_IDS,
  calculateAchievementProgress
} from '../helpers/achievementProgress';
import localDataService from '../services/localDataService';
import { useLocalStorage } from '@uidotdev/usehooks';
import XPBar from './XPBar';
import { checkBadgeUnlock } from '../components/Badges';
import { useUserSettings } from '../hooks/useUserSettings';
import '../styles/Achievements.css'
import LoadingSpinner from './LoadingSpinner';
import VF5ProfileBorder from './VF5ProfileBorder';

const Achievements = () => {
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage('unlockedBadges', []);
  const [userSelectedMilestoneValue, setUserSelectedMilestoneValue] = useState(() => {
    return localDataService.getUserSelectedMilestone();
  });
  const query = useStepsData();
  const { settings } = useUserSettings();
  const { pendingAchievements, dismissAchievement } = useAchievementContext();
  const stepsData = query.data || [];
  
  useEffect(() => {
    if (query.data) {
      // Get cached weather data from localStorage
      const cachedWeatherData = settings.enableWeather ? 
        JSON.parse(localStorage.getItem('weatherData') || '{}') : {};

      const newUnlockedBadges = checkBadgeUnlock(query.data, cachedWeatherData, settings.enableWeather);
      setUnlockedBadges(newUnlockedBadges);
    }
  }, [query.data, settings.enableWeather]);

  const calculateMilestoneDays = () => {
    let runningTotal = 0;
    let currentMilestoneIndex = 0;

    for (const dayData of stepsData) {
      runningTotal += dayData.steps;

      while (currentMilestoneIndex < milestones.length && 
             runningTotal >= milestones[currentMilestoneIndex].value) {
        currentMilestoneIndex++;
      }
    }

    return { lastAchievedIndex: currentMilestoneIndex - 1 };
  };

  const { lastAchievedIndex } = useMemo(
    () => calculateMilestoneDays(),
    [stepsData]
  );


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

  const getAchievementPreviewStyle = (milestone) => {
    if (!milestone?.titleImage) {
      return undefined;
    }

    return {
      '--achievement-preview-image': `url(${milestone.titleImage})`,
      '--achievement-preview-size': milestone.titleImageSize || 'cover',
      '--achievement-preview-position': milestone.titleImagePos || 'center'
    };
  };

  const getAchievementIcon = (type) => {
    switch (type) {
      case 'badge': return '🏆';
      case 'milestone': return '󰖃';
      default: return '🎉';
    }
  };

  const formatAchievementUnlockDate = (unlockDate, dateFormat = 'dd/MM/yy') => {
    if (!unlockDate) {
      return null;
    }

    const isoDate = parseISO(unlockDate);
    if (isValid(isoDate)) {
      return format(isoDate, dateFormat);
    }

    const fallbackDate = new Date(unlockDate);
    if (isValid(fallbackDate)) {
      return format(fallbackDate, dateFormat);
    }

    return null;
  };

  const renderProgressValueText = (label) => {
    if (typeof label !== 'string') {
      return label;
    }

    const slashIndex = label.indexOf(' / ');
    if (slashIndex === -1) {
      return label;
    }

    const currentValue = label.slice(0, slashIndex);
    const targetValue = label.slice(slashIndex + 3);

    return (
      <>
        <span className="progress-current-value">{currentValue}</span>
        <span className="progress-target-value"> / {targetValue}</span>
      </>
    );
  };

  const cachedWeatherData = useMemo(() => {
    if (!settings.enableWeather) {
      return {};
    }
    try {
      return JSON.parse(localStorage.getItem('weatherData') || '{}');
    } catch {
      return {};
    }
  }, [settings.enableWeather]);

  const challengeBadges = useMemo(
    () => badges.filter(badge => !DEFAULT_EMBLEM_BADGE_IDS.has(badge.id)),
    []
  );

  const unlockedBadgeIds = useMemo(
    () => new Set(unlockedBadges.map(badge => badge.id)),
    [unlockedBadges]
  );

  const unlockedBadgeMap = useMemo(
    () => new Map(unlockedBadges.map(badge => [badge.id, badge])),
    [unlockedBadges]
  );

  const badgeProgress = useMemo(
    () => calculateAchievementProgress(stepsData, cachedWeatherData, settings.enableWeather),
    [stepsData, cachedWeatherData, settings.enableWeather]
  );

  // Keep hook order stable by returning only after all hooks run.
  if (query.isLoading) return <LoadingSpinner/>;
  if (query.isError) return <div>Error fetching steps data.</div>;

  return (
    <>
      <div className="sticky-header">
        <XPBar/>
        <VF5ProfileBorder />
      </div>

        <div className="achievements-container">
          
          {/* Pending Achievements Section */}
          {pendingAchievements.length > 0 && (
            <div className="pending-achievements-section">
              <div className="pending-achievements-header">
                <p><span>󰝧</span> New Unlocks</p>
              </div>
              
              <div className="pending-achievements-list">
                  {pendingAchievements.map((achievement, index) => {
                    const formattedPendingUnlockDate = formatAchievementUnlockDate(achievement?.unlockDate);

                    return (
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
                          {formattedPendingUnlockDate ? `Unlocked ${formattedPendingUnlockDate}` : 'Unlocked recently'}
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
                    );
                  })}
              </div>
            </div>
          )}
          
          <h3>Milestones</h3>
          {/* Achieved Milestones */}
          <div className="milestones-section">
            {milestones.map((milestone) => {
              const isAchieved = milestone.value <= (milestones[lastAchievedIndex]?.value || 0);
              
              return isAchieved ? (
                <div 
                  key={milestone.value}
                  className={`milestone-item achieved ${milestone.rarity}`}
                >
                  <p className="milestone-value">
                    <span className="milestone-star">󰖃</span>
                    {milestone.value.toLocaleString()}
                  </p>
                </div>
              ) : (
                <div key={milestone.value} className="milestone-item locked">
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
            <h3>Achievements</h3>
            <div className="achievement-progress-list">
              {challengeBadges.map((badge, badgeIndex) => {
                const isUnlocked = unlockedBadgeIds.has(badge.id);
                const unlockedBadge = unlockedBadgeMap.get(badge.id);
                const linkedMilestone = milestones[badgeIndex] || null;
                const isSelectedBackground = linkedMilestone && userSelectedMilestoneValue === linkedMilestone.value;
                const isSelectable = Boolean(isUnlocked && linkedMilestone);
                const progress = badgeProgress[badge.id] || { percent: 0, label: 'No progress yet', isBinary: false, displayMode: 'bar' };
                const displayMode = progress.displayMode || (progress.isBinary ? 'binary' : 'bar');
                const progressPercent = isUnlocked ? 100 : Math.round(progress.percent * 100);
                const progressStateIcon = '🔒';
                const progressStateLabel = 'Locked';
                const progressStateClass = 'locked';
                const progressValueClass = `achievement-progress-value ${progress.labelVariant === 'attempt' ? 'attempt-progress-value' : ''}`;
                const formattedUnlockDate = formatAchievementUnlockDate(unlockedBadge?.unlockDate);

                return (
                  <div
                    key={badge.id}
                    className={`achievement-progress-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelectedBackground ? 'user-selected' : ''} ${isUnlocked && linkedMilestone?.titleImage ? 'has-preview-image' : ''}`}
                    onClick={isSelectable ? () => handleMilestoneSelection(linkedMilestone) : undefined}
                    onKeyDown={(event) => {
                      if (!isSelectable) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleMilestoneSelection(linkedMilestone);
                      }
                    }}
                    role={isSelectable ? 'button' : undefined}
                    tabIndex={isSelectable ? 0 : undefined}
                    aria-disabled={!isSelectable}
                    style={isUnlocked ? getAchievementPreviewStyle(linkedMilestone) : undefined}
                  >
                    <div className="achievement-progress-header">
                      <p className="achievement-progress-name">{badge.name}</p>
                      <div className="achievement-progress-status">
                        {badge.requiresWeather && (
                          <span className="weather-achievement-icon" aria-label="Weather achievement" title="Weather achievement">
                            ⛅
                          </span>
                        )}
                        {!isUnlocked ? (
                          <p
                            className={`achievement-progress-state progress-icon ${progressStateClass}`}
                            aria-label={progressStateLabel}
                            title={progressStateLabel}
                          >
                            {progressStateIcon}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <p className="achievement-progress-requirement">{badge.description}</p>

                    {!isUnlocked && (
                      displayMode === 'bar' ? (
                        <>
                          <div className="achievement-progress-track" aria-hidden="true">
                            <div
                              className="achievement-progress-fill"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          <p className={progressValueClass}>{renderProgressValueText(progress.label)}</p>
                        </>
                      ) : (
                        <p className={progressValueClass}>{renderProgressValueText(progress.label)}</p>
                      )
                    )}

                    {isUnlocked && (
                      <p className="achievement-progress-value completion-date-value">
                        {formattedUnlockDate ? `✔ ${formattedUnlockDate}` : 'Completed'}
                      </p>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        </div>
    </>
  );
};

export default Achievements;