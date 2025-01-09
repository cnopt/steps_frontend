import React from 'react';
import '../styles/HourlyStepsGraph.css';
import { useUserSettings } from '../hooks/useUserSettings';

const HourlyStepsGraph = ({ hourlySteps, sunsetTime }) => {
    const { settings } = useUserSettings();
    const maxSteps = Math.max(...Object.values(hourlySteps));
    
    const getBarHeight = (steps) => {
        if (maxSteps === 0) return 2;
        
        const baseHeight = (steps / maxSteps) * 100;
        
        // thresholds
        if (baseHeight === 0) return 1;
        if (baseHeight < 15) return baseHeight * 0.3; // low activity
        if (baseHeight < 30) return baseHeight * 0.5; // med-low activity
        if (baseHeight < 60) return baseHeight * 0.8; // med-high activity
        return baseHeight; // leave high activity the same
    };

    const shouldShowLabel = (hour) => hour % 4 === 0;

    // Convert sunset time string to hour number (e.g., "18:30" -> 18.5)
    const getSunsetHour = (timeString) => {
        if (!timeString) return null;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours + (minutes / 60);
    };

    const sunsetHour = getSunsetHour(sunsetTime);
    const sunsetPosition = sunsetHour ? `${(sunsetHour / 24) * 100}%` : null;

    return (
        <div className="hourly-steps-graph">
            <div className="graph-container">
                {sunsetHour && (
                    <div 
                        className="sunset-line"
                        style={{
                            left: sunsetPosition,
                            position: 'absolute',
                            height: '100%',
                            width: '1px',
                            background: 'rgba(255, 180, 0, 0.3)',
                            zIndex: 1,
                            pointerEvents: 'none'
                        }}
                    />
                )}
                {Object.entries(hourlySteps).map(([hour, steps]) => {
                    const height = getBarHeight(steps)*0.65;
                    return (
                        <div key={hour} className="hour-bar-container">
                            <div 
                                className="hour-bar"
                                style={{ 
                                    background: settings.gender === 'M' ? '#1c2e48' : '#4f1d32',
                                    // background: steps === 0 ? 'black' : '#1c2e48',
                                    height: `${height}%`,
                                    borderRadius: steps === 0 ? '100%' : '6px',
                                    width: steps === 0 ? '3px' : '3px'
                                }}
                            >
                                <span className="step-count">{steps}</span>
                            </div>
                            {shouldShowLabel(parseInt(hour)) && (
                                <span className="hour-label">
                                    {hour.padStart(2, '0')}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HourlyStepsGraph; 