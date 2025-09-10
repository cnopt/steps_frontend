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

    // Group walks by date
    const walksByDate = sortedWalks.reduce((acc, walk) => {
        const date = walk.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(walk);
        return acc;
    }, {});

    return (
        <>
            <XPBar />
            <div className="walks-container">
                <div className="walks-header">
                    <p className="walks-count">{sortedWalks.length} walks recorded</p>
                </div>
                
                <div className="walks-list">
                    {sortedWalks.length === 0 ? (
                        <div className="no-walks">
                            <p>No walks recorded yet</p>
                            <p>Start recording your walks to see them here.</p>
                        </div>
                    ) : (
                        Object.entries(walksByDate).map(([date, walks]) => (
                            <div key={date} className="walks-date-group">
                                <div className="walks-date-header">
                                    <h2>{formatDate(date)}</h2>
                                </div>
                                {walks.map((walk, index) => (
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
                                                width: '100%', 
                                                height: '110px', 
                                                borderRadius: '12px',
                                                borderTopLeftRadius: 0,
                                                borderTopRightRadius: 0,
                                                flexShrink: 0
                                            }}
                                            alt={`${walk.name} thumbnail`}
                                        />
                                        <div className="walk-info">
                                            <div className="walk-main-info">
                                                <h3 className="walk-title">{walk.name.substring(walk.name.indexOf(' ') + 1)}</h3>
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
                                                        {Math.round(walk.min_elevation)}m - {Math.round(walk.max_elevation)}m
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
            <Dock />
        </>
    );
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc)
function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1:  return 'st';
        case 2:  return 'nd';
        case 3:  return 'rd';
        default: return 'th';
    }
}

// Helper function to check if a date is in the current week
function isInCurrentWeek(date, today) {
    const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dateDay = date.getDay();
    
    // Calculate the start of the current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - todayDay);
    startOfWeek.setHours(0, 0, 0, 0);
    
    return date >= startOfWeek && date <= today;
}

// Helper function to format date in a readable way
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Set hours to 0 for date comparison
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
        return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    } else if (isInCurrentWeek(date, today)) {
        // If it's this week, just show the day name
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
        // For dates from last week or earlier, show the full date
        const day = date.getDate();
        const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        const currentYear = today.getFullYear();
        
        const formattedDate = `${weekday} ${day}${getOrdinalSuffix(day)} ${month}`;
        return year !== currentYear ? `${formattedDate}, ${year}` : formattedDate;
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