import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../styles/XPBar.css'


const fetchStepsData = async () => {
    const response = await axios.get('https://yxa.gr/steps/allstepsdata');
    return response.data;
  };

export default function XPBar() {
    const [isExpanded, setIsExpanded] = useState(false);
    const detailsRef = useRef(null);

    const query = useQuery({
        queryKey: ['stepsData'],
        queryFn: fetchStepsData,
    });

    if (query.isLoading) {
        return <div>Loading...</div>;
    }

    if (query.isError || !query.data) {
        return <div>Error fetching data.</div>;
    }

    const allSteps = query.data.dev; // Steps data from API
    //const allSteps = steps.dev;
  
    const allTimeTotalSteps = allSteps.reduce((acc, item) => acc + item.steps, 0);

    const calculateLevel = (totalSteps) => {
        // Each level requires more XP than the last
        // Using a simple exponential formula: baseXP * (level ^ 1.5)
        const baseXP = 8000;
        let level = 1;
        
        while ((baseXP * (Math.pow(level, 1.5))) <= totalSteps) {
          level++;
        }
        
        return {
          currentLevel: level - 1,
          nextLevel: level,
          currentLevelXP: baseXP * (Math.pow(level - 1, 1.5)),
          nextLevelXP: baseXP * (Math.pow(level, 1.5)),
        };
      };

    const levelInfo = calculateLevel(allTimeTotalSteps);

    const progressPercentage = ((allTimeTotalSteps - levelInfo.currentLevelXP) /
        (levelInfo.nextLevelXP - levelInfo.currentLevelXP)) * 100;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (detailsRef.current && !detailsRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return(
        <>
            {isExpanded && <div className="overlay" />}
            <div ref={detailsRef}>
                <div 
                    className="level-progress-container" 
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="level-progress-bar" style={{ width: `${progressPercentage}%` }}></div>
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
                <div className={`level-details ${isExpanded ? 'expanded' : ''}`}>
                    <div className="details-content">
                        {/* <p>󰇆</p> */}
                        <p>Current XP: {allTimeTotalSteps.toLocaleString()}</p>
                        <p>XP for Next Level: {levelInfo.nextLevelXP.toLocaleString()}</p>
                        <p>XP Needed: {(levelInfo.nextLevelXP - allTimeTotalSteps).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </>
    )
}