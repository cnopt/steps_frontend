import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStepsData } from '../hooks/useStepsData';
import XPBar from './XPBar';
import Dock from './Dock';
import LoadingSpinner from './LoadingSpinner';
import WalkThumbnail from './WalkThumbnail';
import PageTransition from './PageTransition';
import { getTodayLocalDateString } from '../helpers/dateUtils';
import '../styles/Walks.css';

export default function Walks() {
    const navigate = useNavigate();
    const query = useStepsData();
    const listVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.035
            }
        }
    };

    const rowVariants = {
        hidden: { opacity: 0, y: 6 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.16, ease: 'easeOut' }
        }
    };

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
    const sortedWalks = [...allWalks].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    return (
        <>
            <XPBar />
                <div className="walks-container">
                    <div className="walks-header">
                        <p className="walks-count"><span>{sortedWalks.length}</span> walks recorded</p>
                        <p className="walks-helper-info"><span>󰆽</span> Press a card to open the full walk</p>
                    </div>
                    
                    <motion.div
                        className="walks-list"
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {sortedWalks.length === 0 ? (
                            <div className="no-walks">
                                <p>No walks recorded yet</p>
                                <p>Start recording your walks to see them here.</p>
                            </div>
                        ) : (
                            sortedWalks.map((walk, index) => (
                                <motion.div
                                    key={`${walk.date}-${walk.filename}-${index}`}
                                    className="walk-row"
                                    variants={rowVariants}
                                    onClick={() => handleWalkClick(walk)}
                                >
                                    <div className="walk-cell walk-cell-date">
                                        <span className="walk-date-primary">
                                            {formatDateDDMMYY(walk.date)}
                                        </span>
                                        <span className="walk-date-secondary">
                                            {walk.start_time && walk.end_time
                                                ? formatTimeRange(walk.start_time, walk.end_time)
                                                : '-'}
                                        </span>
                                    </div>
                                    <div
                                        className="walk-cell walk-cell-main"
                                    >
                                        <div
                                            className="walk-cell-name"
                                            title={formatWalkName(walk.name)}
                                        >
                                            {formatWalkName(walk.name)}
                                        </div>
                                        <div className="walk-cell-distance">
                                            {formatDistance(walk.total_distance)}
                                        </div>
                                    </div>
                                    <div className="walk-cell walk-cell-thumbnail">
                                        <WalkThumbnail
                                            walkFileName={walk.filename}
                                            className="walk-thumbnail"
                                            alt={`${formatWalkName(walk.name)} thumbnail`}
                                        />
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                </div>
                <Dock />
            <div
                className="walks-sticky-add"
            >
                <button
                    type="button"
                    className="walks-add-new-btn"
                    onClick={() => navigate('/insert-walk', {
                        state: {
                            selectedDate: getTodayLocalDateString()
                        }
                    })}
                >
                    <span>󰖃</span> Record New Walk
                </button>
            </div>
        </>
    );
}

function formatDateDDMMYY(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString || '-';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
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

function formatWalkName(name) {
    if (!name) return 'Untitled walk';
    const firstSpace = name.indexOf(' ');
    return firstSpace > -1 ? name.substring(firstSpace + 1) : name;
}

function formatDistance(distance) {
    if (distance === undefined || distance === null) {
        return '-';
    }

    const numericDistance = Number(distance);
    if (Number.isNaN(numericDistance)) {
        return '-';
    }

    return `${numericDistance.toFixed(1)} mi`;
}