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
  const [userSelectedBadgeId, setUserSelectedBadgeId] = useState(() => {
    return localDataService.getSelectedBadgeId();
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


  const handleBadgeSelection = (badge) => {
    try {
      const result = localDataService.setSelectedBadgeId(badge);

      if (result.success) {
        setUserSelectedBadgeId(result.selectedBadgeId);
      }
    } catch (error) {
      console.error('Error selecting badge:', error);
    }
  };

  const getAchievementPreviewStyle = (badge) => {
    if (!badge?.titleImage) {
      return undefined;
    }

    const [posX = 'center', posY = 'center'] = (badge.titleImagePos || 'center center').split(' ');
    return {
      '--achievement-preview-image': `url(${badge.titleImage})`,
      '--achievement-preview-size': badge.titleImageSize || 'cover',
      '--achievement-preview-x': posX,
      '--achievement-preview-y': posY,
    };
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
              {challengeBadges.map((badge) => {
                const isUnlocked = unlockedBadgeIds.has(badge.id);
                const unlockedBadge = unlockedBadgeMap.get(badge.id);
                const isSelectedBackground = userSelectedBadgeId === badge.id;
                const isSelectable = Boolean(isUnlocked && badge.titleImage);
                const progress = badgeProgress[badge.id] || { percent: 0, label: 'No progress yet', isBinary: false, displayMode: 'bar' };
                const displayMode = progress.displayMode || (progress.isBinary ? 'binary' : 'bar');
                const progressPercent = isUnlocked ? 100 : Math.round(progress.percent * 100);
                const progressStateIcon = '🔒';
                const progressStateLabel = 'Locked';
                const progressStateClass = 'locked';
                const progressValueClass = `achievement-progress-value ${progress.labelVariant === 'attempt' ? 'attempt-progress-value' : ''}`;
                const formattedUnlockDate = formatAchievementUnlockDate(unlockedBadge?.unlockDate);

                const pendingIndex = pendingAchievements.findIndex(
                  a => a.type === 'badge' && (a.id || a.value) === badge.id
                );
                const isNew = isUnlocked && pendingIndex >= 0;
                const isClickable = isSelectable || isNew;

                const handleCardClick = () => {
                  if (isNew && pendingIndex >= 0) {
                    dismissAchievement(pendingIndex);
                  }
                  if (isSelectable) {
                    handleBadgeSelection(badge);
                  }
                };

                return (
                  <div
                    key={badge.id}
                    className={`achievement-progress-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelectedBackground ? 'user-selected' : ''} ${isUnlocked && badge.titleImage ? 'has-preview-image' : ''}`}
                    onClick={isClickable ? handleCardClick : undefined}
                    onKeyDown={(event) => {
                      if (!isClickable) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleCardClick();
                      }
                    }}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    aria-disabled={!isClickable}
                    style={isUnlocked ? getAchievementPreviewStyle(badge) : undefined}
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
                      <div className="completion-date-container">
                        {isNew && <span className="achievement-new-indicator"><span className="achievement-new-indicator-icon">󰝧</span>NEW</span>}
                        <p className="achievement-progress-value completion-date-value">
                          {formattedUnlockDate ? `✔ ${formattedUnlockDate}` : 'Completed'}
                        </p>
                      </div>
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