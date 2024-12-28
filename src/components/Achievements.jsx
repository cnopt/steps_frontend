import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import '../styles/Achievements.css'
import NavBar from './NavBar';



const fetchStepsData = async () => {
  const response = await axios.get('https://yxa.gr/steps/allstepsdata');
  return response.data;
};

const Achievements = () => {
  const query = useQuery({
    queryKey: ['stepsData'],
    queryFn: fetchStepsData,
  });

  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error fetching data.</div>;

  const milestones = [
    100000, 250000, 300000, 400000, 500000, 600000, 700000, 800000, 900000,
    1000000, 1100000, 1200000, 1300000, 1400000, 1500000, 1600000, 1700000,
    1800000, 1900000, 2000000,
  ];

  const calculateMilestoneDays = () => {
    const sortedSteps = [...query.data.dev].sort(
      (a, b) => new Date(a.formatted_date) - new Date(b.formatted_date)
    );

    const milestoneDays = new Map();
    let runningTotal = 0;
    let currentMilestoneIndex = 0;

    for (const dayData of sortedSteps) {
      runningTotal += dayData.steps;

      while (currentMilestoneIndex < milestones.length && 
             runningTotal >= milestones[currentMilestoneIndex]) {
        milestoneDays.set(
          milestones[currentMilestoneIndex],
          dayData.formatted_date
        );
        currentMilestoneIndex++;
      }
    }

    return { milestoneDays, lastAchievedIndex: currentMilestoneIndex - 1 };
  };

  const { milestoneDays, lastAchievedIndex } = calculateMilestoneDays();

  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    return format(date, 'do MMMM yyyy');
  };

  return (
    <>
      <NavBar/>
      <div className="achievements-container">
        
        <h3>Achieved (<span style={{color:'gold'}}>{milestoneDays.size}</span>)</h3>
        {/* Achieved Milestones */}
        <div className="milestones-done-section">
          
          {milestones.slice(0, lastAchievedIndex + 1).reverse().map((milestone) => (
            <div key={milestone} className="milestone-item achieved">
              
              <span className="milestone-value">
                <span className="milestone-star">󰄵</span>
                {milestone.toLocaleString()} steps
              </span>
              <span className="milestone-date">
                Unlocked: <br/>
                {formatDate(milestoneDays.get(milestone))}
              </span>
            </div>
          ))}
        </div>

        {/* Upcoming Milestones */}
        <div className="milestones-section upcoming">
          {console.log()}
          <h3>Upcoming ({milestones.length-milestoneDays.size})</h3>
          {milestones.slice(lastAchievedIndex + 1).map((milestone) => (
            <div key={milestone} className="milestone-item upcoming">
              <span className="milestone-value">
                <span className="milestone-star">☐</span>
                {milestone.toLocaleString()} steps
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Achievements;