import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStepsData } from '../hooks/useStepsData';
import XPBar from './XPBar';
import Dock from './Dock';
import LoadingSpinner from './LoadingSpinner';
import WalkThumbnail from './WalkThumbnail';
import '../styles/Walks.css';

export default function Walks() {
    const navigate = useNavigate();
    const query = useStepsData();

    const handleWalkClick = (walk) => {
        // Navigate to WalkView with the GPX filename
        navigate('/walkview', {
            state: {
                walkFile: walk.filename
            }
        });
    };

    if (query.isLoading) {
        return <LoadingSpinner />;
    }

    if (query.isError || !query.data) {
        return <div className="walks-error">Error fetching data.</div>;
    }

    // Get all walks from all dates and flatten them
    const allWalks = [];
    query.data.forEach(dayEntry => {
        if (dayEntry.walks && dayEntry.walks.length > 0) {
            dayEntry.walks.forEach(walk => {
                allWalks.push({
                    ...walk,
                    date: dayEntry.formatted_date
                });
            });
        }
    });

    // Sort walks by newest to oldest (using walk date)
    const sortedWalks = allWalks.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    return (
        <>
            <XPBar />
            <div className="walks-container">
                <div className="walks-header">
                    <h1>Your Walks</h1>
                    <p className="walks-count">{sortedWalks.length} walks recorded</p>
                </div>
                
                <div className="walks-list">
                    {sortedWalks.length === 0 ? (
                        <div className="no-walks">
                            <p>No walks recorded yet</p>
                            <p>Start recording your walks to see them here.</p>
                        </div>
                    ) : (
                        sortedWalks.map((walk, index) => (
                            <div 
                                key={`${walk.date}-${walk.filename}-${index}`} 
                                className="walk-item"
                                onClick={() => handleWalkClick(walk)}
                            >
                                <div className="walk-content">
                                    <WalkThumbnail 
                                        walkFileName={walk.filename}
                                        className="walk-thumbnail"
                                        style={{ 
                                            width: '140px', 
                                            height: '105px', 
                                            borderRadius: '8px',
                                            flexShrink: 0
                                        }}
                                        alt={`${walk.name} thumbnail`}
                                    />
                                    <div className="walk-info">
                                        <div className="walk-main-info">
                                            <h3 className="walk-title">{walk.name}</h3>
                                            <p className="walk-date">{formatDate(walk.date)}</p>
                                        </div>
                                        <div className="walk-meta">
                                            {walk.start_time && walk.end_time && (
                                                <span className="walk-time-range">
                                                    {formatTimeRange(walk.start_time, walk.end_time)}
                                                </span>
                                            )}
                                            {walk.total_distance !== undefined && (
                                                <span className="walk-distance">
                                                    {walk.total_distance.toFixed(1)} mi
                                                </span>
                                            )}
                                            {walk.min_elevation !== undefined && walk.max_elevation !== undefined && (
                                                <span className="walk-elevation">
                                                    󰾧 {Math.round(walk.min_elevation)}m - {Math.round(walk.max_elevation)}m
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <Dock />
        </>
    );
}

// Helper function to format date in a readable way
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Helper function to format time
function formatTime(timeString) {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Helper function to format time range (start - end)
function formatTimeRange(startTimeString, endTimeString) {
    const startTime = new Date(startTimeString);
    const endTime = new Date(endTimeString);
    
    const formatTime24 = (date) => {
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };
    
    return `${formatTime24(startTime)} - ${formatTime24(endTime)}`;
}