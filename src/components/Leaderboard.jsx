import React, { useState } from 'react';
import { useLeaderboard, useUserRank } from '../hooks/useLeaderboard';
import XPBar from './XPBar';
import LoadingSpinner from './LoadingSpinner';
import PageTransition from './PageTransition';
import VF5ProfileBorder from './VF5ProfileBorder';
import { format, parseISO } from 'date-fns';
import '../styles/Leaderboard.css';

const Leaderboard = () => {
  const [selectedType, setSelectedType] = useState('yesterday');
  
  const { 
    leaderboard, 
    isLoading, 
    isError, 
    error, 
    date, 
    totalEntries,
    isSuccess 
  } = useLeaderboard(selectedType, { limit: 5 });

  const { 
    rank: userRank, 
    stepCount: userSteps, 
    isLoading: rankLoading,
    isSuccess: rankSuccess 
  } = useUserRank(selectedType);

  if (isLoading) return <LoadingSpinner />;

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

  return (
    <>
      <XPBar />
      <PageTransition>
        <div className="leaderboard-container">
          <div className="leaderboard-header">
            <h2>Leaderboard</h2>
            <p className="leaderboard-subtitle">
              {date ? formatDate(date) : 'Yesterday\'s Top Steps'}
            </p>
          </div>

          {/* Leaderboard Section */}
          <div className="leaderboard-section">
            <h3>Top 5 Users</h3>
            
            {isError && (
              <div className="error-message">
                <p>Failed to load leaderboard</p>
                <p className="error-details">{error?.message || 'Unknown error'}</p>
              </div>
            )}

            {isSuccess && leaderboard.length === 0 && (
              <div className="empty-leaderboard">
                <p>🚶 No data available for yesterday</p>
                <p className="empty-subtitle">Be the first to upload your steps!</p>
              </div>
            )}

            {isSuccess && leaderboard.length > 0 && (
              <div className="leaderboard-list">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={`${entry.user_id}-${entry.rank}`} 
                    className={`leaderboard-item rank-${entry.rank}`}
                  >
                    <div className="rank-section">
                      {/* <span className="rank-emoji">{getRankEmoji(entry.rank)}</span> */}
                      <span className="rank-number">#{entry.rank}</span>
                    </div>
                    
                    <div className="user-section">
                      <VF5ProfileBorder 
                        username={entry.profile?.username || entry.name || `User${entry.user_id}`}
                        badgeId={entry.profile?.selected_badge}
                        showDescription={false}
                        size="small"
                      />
                    </div>
                    
                    <div className="leaderboard-steps-section">
                      <span className="leaderboard-step-count">{formatSteps(entry.step_count)}</span>
                      <span className="leaderboard-steps-label">steps</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalEntries > 0 && (
              <div className="leaderboard-footer">
                <p>Showing top 5 of {totalEntries} users</p>
              </div>
            )}
          </div>

          {/* User's Rank Section */}
          {rankSuccess && userRank && (
          <div className="user-rank-section">
            <div className="user-rank-card">
              {/* <span className="user-rank-emoji">{getRankEmoji(userRank)}</span> */}
              <div className="user-rank-info">
                <div className="user-rank-position">Your Rank: #{userRank}</div>
                <div className="user-rank-steps">{formatSteps(userSteps)} steps</div>
              </div>
            </div>
          </div>
          )}

          {/* Instructions Section */}
          {/* <div className="instructions-section">
            <h4>📱 How to join the leaderboard</h4>
            <ol>
              <li>Record your daily steps in the app</li>
              <li>Go to Settings → Database Upload</li>
              <li>Upload your steps to compete with others</li>
              <li>Check back here to see your ranking!</li>
            </ol>
          </div>*/}
          
        </div> 
      </PageTransition>
    </>
  );
};

export default Leaderboard; 