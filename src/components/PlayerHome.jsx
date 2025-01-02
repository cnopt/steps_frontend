import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useStepsData } from '../hooks/useStepsData';
import { useLocalStorage } from '@uidotdev/usehooks';
import { calculateMilestoneDays } from '../helpers/milestones';
import NavBar from './NavBar';
import LoadingSpinner from './LoadingSpinner';
import '../styles/PlayerHome.css';

export default function PlayerHome() {
    const query = useStepsData();
    const [time, setTime] = useState(new Date());
    const [unlockedBadges] = useLocalStorage('unlockedBadges', []);
    
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (query.isLoading) return <LoadingSpinner/>;
    if (query.isError) return <div>Error fetching data.</div>;

    const allTimeTotalSteps = query.data.reduce((acc, item) => acc + item.steps, 0);
    const milestoneDays = calculateMilestoneDays({ allSteps: query.data });
    
    // Level calculation
    const calculateLevel = (totalSteps) => {
        const baseXP = 8000;
        let level = 1;
        
        while ((baseXP * (Math.pow(level, 1.3))) <= totalSteps) {
            level++;
        }
        
        return {
            currentLevel: level - 1,
            nextLevel: level,
            currentLevelXP: baseXP * (Math.pow(level - 1, 1.3)),
            nextLevelXP: baseXP * (Math.pow(level, 1.3)),
        };
    };

    const levelInfo = calculateLevel(allTimeTotalSteps);
    const progressPercentage = ((allTimeTotalSteps - levelInfo.currentLevelXP) /
        (levelInfo.nextLevelXP - levelInfo.currentLevelXP)) * 100;

    const totalSegments = 30;
    const filledSegments = Math.floor((progressPercentage / 100) * totalSegments);

    const hourRotation = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;
    const minuteRotation = time.getMinutes() * 6;

    // Calculate hours remaining in the day
    const now = new Date();
    const hoursRemaining = 24 - now.getHours() - (now.getMinutes() / 60);
    const timePercentage = (hoursRemaining / 24) * 100;
    
    // Convert percentage to rotation angle (-10 to -170 degrees)
    const needleRotation = -10 + (-160 * (1 - (timePercentage / 100)));

    return (
        <>
            <NavBar />
            <div className="level-gauge-container">
                <div className="fuel-indicator">
                    <div className="fuel-bar">
                        <div className="fuel-markings">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="fuel-marking" />
                            ))}
                        </div>
                        <div 
                            className="fuel-needle"
                            style={{ transform: `translate(0%, -50%) rotate(${needleRotation}deg)` }}
                        />
                    </div>
                    <div className="fuel-labels">
                        <span>E</span>
                        <span>12h</span>
                        <span>F</span>
                    </div>
                </div>

                <div className="stats-display">
                    <div className="stat-item">
                        <span className="stat-label">TOTAL</span>
                        <span className="stat-value">{allTimeTotalSteps.toLocaleString()}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">BADGES</span>
                        <span className="stat-value">{unlockedBadges.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">MILESTONES</span>
                        <span className="stat-value">{milestoneDays.size}</span>
                    </div>
                    <div className="clock">
                        <div 
                            className="clock-hand hour-hand" 
                            style={{ transform: `rotate(${hourRotation}deg)` }} 
                        />
                        <div 
                            className="clock-hand minute-hand" 
                            style={{ transform: `rotate(${minuteRotation}deg)` }} 
                        />
                    </div>
                </div>

                <div className="level-gauge">
                    <div className="gauge-numbers">
                        {[...Array(10)].map((_, i) => (
                            <span key={i}>{i + 1}</span>
                        ))}
                    </div>
                    {[...Array(totalSegments)].map((_, index) => (
                        <div
                            key={index}
                            className={`gauge-segment ${index < filledSegments ? 'filled' : ''}`}
                        />
                    ))}
                </div>

                <div className="info-bar">
                    <div className="date">
                        {format(new Date(), 'MM/dd/yy')}
                    </div>
                    <div className="time">
                        {format(new Date(), 'HH:mm')}
                    </div>
                    <div className="level">
                        LVL {levelInfo.currentLevel}
                    </div>
                </div>
            </div>
        </>
    );
}