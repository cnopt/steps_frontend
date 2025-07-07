import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLeaderboard, useUserRank } from '../hooks/useLeaderboard';
import { useStepsData } from '../hooks/useStepsData';
import { upsertData, testConnection, upsertUserProfile, selectAllData } from '../services/supabaseService';
import { getTodayLocalDateString } from '../helpers/dateUtils';
import localDataService from '../services/localDataService';
import userService from '../services/userService';
import leaderboardService from '../services/leaderboardService';
import XPBar from './XPBar';
import LoadingSpinner from './LoadingSpinner';
import PageTransition from './PageTransition';
import VF5ProfileBorder from './VF5ProfileBorder';
import { format, parseISO } from 'date-fns';
import '../styles/Leaderboard.css';
import { MdOutlineSync } from "react-icons/md";

const Leaderboard = () => {
  const [selectedType, setSelectedType] = useState('yesterday');
  const [showContextualRanking, setShowContextualRanking] = useState(false);
  const [contextualData, setContextualData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    error: null,
    success: null,
    oldRank: null,
    newRank: null
  });
  const [stepsDifference, setStepsDifference] = useState(0);
  const [isCalculatingDifference, setIsCalculatingDifference] = useState(false);

  const queryClient = useQueryClient();
  const { data: stepsData } = useStepsData();
  
  const { 
    leaderboard, 
    isLoading, 
    isError, 
    error, 
    date, 
    totalEntries,
    isSuccess 
  } = useLeaderboard(selectedType, { 
    limit: showContextualRanking ? 50 : (selectedType === 'alltime' ? null : 5)
  });

  const { 
    rank: userRank, 
    stepCount: userSteps, 
    isLoading: rankLoading,
    isSuccess: rankSuccess 
  } = useUserRank(selectedType);

  // Function to get user's current database steps for today
  const getUserDatabaseSteps = async () => {
    try {
      const today = getTodayLocalDateString();
      const userData = userService.getUserDataForDatabase();
      
      const { data, error } = await selectAllData('user_daily_steps', {
        columns: 'step_count',
        filters: {
          user_id: userData.user_id,
          date: today
        }
      });

      if (error) {
        console.error('Error fetching database steps:', error);
        return 0;
      }

      // selectAllData returns an array, so get the first item
      return data && data.length > 0 ? data[0].step_count : 0;
    } catch (error) {
      console.error('Error getting database steps:', error);
      return 0;
    }
  };

  // Function to calculate steps difference
  const calculateStepsDifference = async () => {
    try {
      setIsCalculatingDifference(true);
      const today = getTodayLocalDateString();
      const todayStepsData = stepsData?.find(day => day.formatted_date === today);
      const localSteps = todayStepsData?.steps || 0;
      const databaseSteps = await getUserDatabaseSteps();
      const difference = localSteps - databaseSteps;
      
      setStepsDifference(Math.max(0, difference)); // Don't show negative differences
    } catch (error) {
      console.error('Error calculating steps difference:', error);
      setStepsDifference(0);
    } finally {
      setIsCalculatingDifference(false);
    }
  };

  // Effect to calculate steps difference when component mounts or stepsData changes
  useEffect(() => {
    if (stepsData && stepsData.length > 0) {
      calculateStepsDifference();
    }
  }, [stepsData]);

  // Function to upload step data and refresh leaderboard
  const uploadStepsAndRefresh = async () => {
    try {
      setUploadStatus({ 
        isUploading: true, 
        error: null, 
        success: null, 
        oldRank: userRank,
        newRank: null
      });

      // Test connection first
      const connectionTest = await testConnection();
      if (!connectionTest.success) {
        throw new Error(`Database connection failed: ${connectionTest.message}`);
      }

      // Get today's step count
      const today = getTodayLocalDateString();
      const todayStepsData = stepsData?.find(day => day.formatted_date === today);
      
      if (!todayStepsData) {
        throw new Error('No step data found for today. Please add your steps first.');
      }

      // Get user data
      const userData = userService.getUserDataForDatabase();
      const userProfile = localDataService.getUserProfile();
      
      // Prepare user profile data
      const profileData = {
        user_id: userProfile.userId || userData.user_id,
        username: userProfile.username || userData.username,
        selected_badge: userProfile.selectedBadge || null,
        created_at: userProfile.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Upsert user profile
      const { error: profileError } = await upsertUserProfile(profileData);
      if (profileError) {
        throw new Error(`Profile upload failed: ${profileError.message}`);
      }

      // Prepare steps data
      const recordData = {
        user_id: userData.user_id,
        username: userData.username,
        date: today,
        step_count: todayStepsData.steps
      };

      // Upsert steps data
      const { error: stepsError } = await upsertData('user_daily_steps', recordData, { select: '*' });
      if (stepsError) {
        throw new Error(`Steps upload failed: ${stepsError.message}`);
      }

      // Invalidate and refetch leaderboard queries
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['userRank'] });

      // Wait a moment for the queries to refetch
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Recalculate steps difference after upload
      await calculateStepsDifference();

      // Get contextual leaderboard around user's new position
      const contextualResult = await leaderboardService.getLeaderboardAroundUser(
        userData.user_id, 
        selectedType, 
        3
      );

      if (contextualResult.success) {
        setContextualData(contextualResult);
        setShowContextualRanking(true);
      }

      setUploadStatus({ 
        isUploading: false, 
        error: null, 
        success: `Successfully uploaded ${todayStepsData.steps} steps for ${today}!`, 
        oldRank: userRank,
        newRank: contextualResult.userRank
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, success: null }));
      }, 5000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ 
        isUploading: false, 
        error: error.message, 
        success: null, 
        oldRank: null,
        newRank: null
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'EEEE, MMMM do, yyyy');
    } catch (err) {
      return dateString;
    }
  };

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '1';
      case 2: return '2';
      case 3: return '3';
      default: return '🏃';
    }
  };

  const formatSteps = (steps) => {
    return steps?.toLocaleString() || '0';
  };

  const getRankChange = () => {
    if (uploadStatus.oldRank && uploadStatus.newRank) {
      const change = uploadStatus.oldRank - uploadStatus.newRank;
      if (change > 0) return `↗️ +${change}`;
      if (change < 0) return `↘️ ${change}`;
      return '➡️ No change';
    }
    return null;
  };

  const displayLeaderboard = showContextualRanking && contextualData ? contextualData.data : leaderboard;
  const displayTotalEntries = showContextualRanking && contextualData ? contextualData.totalEntries : totalEntries;

  // Check if database is up to date (reused for styling and text)
  const isDatabaseUpToDate = stepsDifference === 0 && stepsData?.find(day => day.formatted_date === getTodayLocalDateString());

  return (
    <>
      <XPBar />
      <PageTransition>
        <div className="leaderboard-container">
          {/* <div className="leaderboard-header">
            <p>Leaderboards</p>
          </div> */}


          {/* Leaderboard Type Selection */}
          <div className="leaderboard-type-selection">
            <button 
              className={`type-button ${selectedType === 'yesterday' ? 'active' : ''}`}
              onClick={() => {
                setSelectedType('yesterday');
                setShowContextualRanking(false);
              }}
            >
              Yesterday
            </button>
            <button 
              className={`type-button ${selectedType === 'weekly' ? 'active' : ''}`}
              onClick={() => {
                setSelectedType('weekly');
                setShowContextualRanking(false);
              }}
            >
              This Week
            </button>
            <button 
              className={`type-button ${selectedType === 'alltime' ? 'active' : ''}`}
              onClick={() => {
                setSelectedType('alltime');
                setShowContextualRanking(false);
              }}
            >
              All-time
            </button>
          </div>

          {/* Upload Section */}
          <div className="upload-section">
            <button 
              className={`upload-button ${uploadStatus.isUploading ? 'uploading' : ''} ${
                isDatabaseUpToDate ? 'uptodate' : ''
              }`}
              onClick={uploadStepsAndRefresh}
              disabled={uploadStatus.isUploading || isCalculatingDifference}
            >
              {uploadStatus.isUploading ? (
                <>
                  <LoadingSpinner size="small" />
                  Uploading...
                </>
              ) : (
                <>
                  <MdOutlineSync /> 
                  {isCalculatingDifference
                    ? 'Calculating...'
                    : stepsDifference > 0 
                      ? `Push ${formatSteps(stepsDifference)} steps to database`
                      : isDatabaseUpToDate
                        ? 'Database is up to date'
                        : 'Push steps to database'
                  }
                </>
              )}
            </button>
            
            {uploadStatus.success && (
              <div className="upload-success">
                <div className="success-message">
                  ✅ {uploadStatus.success}
                  {getRankChange() && (
                    <div className="rank-change">
                      {getRankChange()}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {uploadStatus.error && (
              <div className="upload-error">
                ❌ {uploadStatus.error}
              </div>
            )}
          </div>

          {/* Contextual Ranking Toggle */}
          {showContextualRanking && (
            <div className="contextual-toggle">
              <button 
                className="toggle-button"
                onClick={() => setShowContextualRanking(false)}
              >
                ← Back to Top Rankings
              </button>
              <div className="contextual-info">
                Showing your position (#{contextualData?.userRank}) and nearby competitors
              </div>
            </div>
          )}

          {/* Leaderboard Section */}
          <div className="leaderboard-section">
            
            {isLoading && <LoadingSpinner />}

            {!isLoading && isError && (
              <div className="error-message">
                <p>Failed to load leaderboard</p>
                <p className="error-details">{error?.message || 'Unknown error'}</p>
              </div>
            )}

            {!isLoading && isSuccess && displayLeaderboard.length === 0 && (
              <div className="empty-leaderboard">
                <p>No data for {selectedType === 'yesterday' ? 'yesterday' : selectedType === 'weekly' ? 'this week' : 'all-time'}</p>
              </div>
            )}

            {!isLoading && isSuccess && displayLeaderboard.length > 0 && (
              <div className="leaderboard-list">
                {/* <div className='leaderboard-list-header'>
                  <p>Username</p>
                  <p>Steps</p>
                </div> */}
                {displayLeaderboard.map((entry, index) => {
                  const isCurrentUser = entry.user_id === userService.getUserId();
                  return (
                    <div 
                      key={`${entry.user_id}-${entry.rank}`} 
                      className={`leaderboard-item rank-${entry.rank} ${isCurrentUser ? 'current-user' : ''}`}
                    >
                      {entry.rank === 1 && (
                        <img 
                          src="./1st-border.png"
                          alt="First Place"
                          className="rank-1-image"
                        />
                      )}

                      {entry.rank === 2 && (
                        <img 
                          src="./2nd-border.png"
                          alt="First Place"
                          className="rank-2-image"
                        />
                      )}
                      
                      <div className="rank-section">
                        <span className="rank-number">#{entry.rank}</span>
                      </div>
                      
                      <div className="user-section">
                        <VF5ProfileBorder 
                          username={entry.profile?.username || entry.name || `User${entry.user_id}`}
                          badgeId={entry.profile?.selected_badge}
                          showDescription={false}
                          size="small"
                        />
                        {isCurrentUser && (
                          <span className="you-indicator"></span>
                        )}
                      </div>
                      
                      <div className="leaderboard-steps-section">
                        <span className="leaderboard-step-count">{formatSteps(entry.step_count)}</span>
                        <span className="leaderboard-steps-label">steps</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && displayTotalEntries > 0 && (
              <div className="leaderboard-footer">
                <p>
                  {showContextualRanking 
                    ? `Showing ranks ${contextualData?.startRank}-${contextualData?.endRank} of ${displayTotalEntries} users`
                    : `Showing top ${Math.min(displayLeaderboard.length, displayTotalEntries)} of ${displayTotalEntries} users`
                  }
                </p>
              </div>
            )}
          </div>

          {/* User's Rank Section - Only show if not in contextual mode */}
          {!showContextualRanking && (
            <>
              {rankLoading && <LoadingSpinner />}

              {!rankLoading && rankSuccess && userRank && (
                <div className="user-rank-section">
                  <div className="user-rank-card">
                    <div className="user-rank-info">
                      <div className="user-rank-position"><span>Your position:</span> {userRank}</div>
                      <div className="user-rank-steps">{formatSteps(userSteps)} steps</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
        </div> 
      </PageTransition>
    </>
  );
};

export default Leaderboard; 