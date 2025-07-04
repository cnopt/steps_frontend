import React from 'react';
import '../styles/Today.css';

const Today = ({ todaysSteps = 0, isLoading = false }) => {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const date = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="today-container">
      <div className="today-content">
        <div className="today-date">
          <span className="today-day">Today</span>
          <span className="today-date-number">{dayName}, {date}</span>
        </div>
        <div className="today-steps">
          <span className="today-steps-number">
            {isLoading ? '...' : todaysSteps.toLocaleString()}
          </span>
          <span className="today-steps-label">steps</span>
        </div>
      </div>
    </div>
  );
};

export default Today; 