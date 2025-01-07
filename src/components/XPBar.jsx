import React, { useState, useEffect, useRef } from 'react';
import { useStepsData } from '../hooks/useStepsData';
import '../styles/XPBar.css'
import LoadingSpinner from './LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserSettings } from '../hooks/useUserSettings';

export default function XPBar() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [previousLevel, setPreviousLevel] = useState(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const detailsRef = useRef(null);
    const query = useStepsData();
    const { settings } = useUserSettings();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (detailsRef.current && !detailsRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (previousLevel !== null && query.data) {
            const levelInfo = calculateLevel(query.data.reduce((acc, item) => acc + item.steps, 0));
            if (levelInfo.currentLevel > previousLevel) {
                triggerCelebration();
                if ('vibrate' in navigator) {
                    navigator.vibrate(200);
                }
            }
            setPreviousLevel(levelInfo.currentLevel);
        }
    }, [query.data, previousLevel]);

    const triggerCelebration = () => {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 1000);
    };

    if (query.isLoading) {
        return <LoadingSpinner/>;
    }

    if (query.isError || !query.data) {
        return <div>Error fetching data.</div>;
    }

    const allSteps = query.data;
    const allTimeTotalSteps = allSteps.reduce((acc, item) => acc + item.steps, 0);

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

    return(
        <>
            {isExpanded && <div className="overlay" />}
            <div ref={detailsRef}>
                <div 
                    className={`level-progress-container ${settings.gender === 'F' ? 'female' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="level-progress-bar" style={{ width: `${progressPercentage}%` }}></div>
                    
                    <AnimatePresence>
                        {showCelebration && (
                            <>

                                <motion.div
                                    className="celebration-container"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="particle"
                                            initial={{ 
                                                x: 0, 
                                                y: 0, 
                                                scale: 0 
                                            }}
                                            animate={{ 
                                                x: (Math.random() * 200 - 100),
                                                y: (Math.random() * 200 - 100),
                                                scale: Math.random() * 2 + 1,
                                                opacity: 0
                                            }}
                                            transition={{
                                                duration: 1,
                                                ease: "easeOut"
                                            }}
                                            style={{
                                                position: 'absolute',
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: `hsl(${Math.random() * 360}, 80%, 60%)`
                                            }}
                                        />
                                    ))}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    <div className="level-progress-content">
                        <span className="current-level">
                            <span></span>
                            {levelInfo.currentLevel}
                        </span>
                        <div className="total-steps">
                            <span>{allTimeTotalSteps.toLocaleString()}</span> steps
                        </div>
                        <span className="next-level">
                            <span></span>
                            {levelInfo.nextLevel}
                        </span>
                    </div>
                </div>

                

                <div className={`level-details ${isExpanded ? 'expanded' : ''} ${settings.gender === 'F' ? 'female' : ''}`}>
                    <div className="details-content">
                        {/* <p>󰇆</p> */}
                        <p>XP for Next Level: {Math.floor(levelInfo.nextLevelXP).toLocaleString()}</p>
                        <p>XP Needed: {Math.floor(levelInfo.nextLevelXP - allTimeTotalSteps).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </>
    )
}