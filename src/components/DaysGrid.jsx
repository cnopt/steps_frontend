import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, parseISO, startOfMonth, getDay, addDays } from 'date-fns';

import steps from '../assets/allstepsdata.json'
import '../styles/DaysGrid.css'

const fetchStepsData = async () => {
  const response = await axios.get('https://yxa.gr/steps/allstepsdta');
  return response.data;
};

const DaysGrid = () => {
  const [currentDate, setCurrentDate] = useState(new Date('2024-12-01'));
  const [selectedDay, setSelectedDay] = useState(null);


  // // Fetch data using the latest React Query v5 syntax
  // const query = useQuery({
  //   queryKey: ['stepsData'],
  //   queryFn: fetchStepsData,
  // });

  // if (query.isLoading) {
  //   return <div>Loading...</div>;
  // }

  // if (query.isError || !query.data) {
  //   return <div>Error fetching data.</div>;
  // }

  const milestones = [
    100000,
    250000,
    300000,
    400000
  ];
  // const allSteps = query.data.dev.filterResultsJSON; // Steps data from API
  const allSteps = steps.dev;
  console.log(allSteps)

  const allTimeTotalSteps = allSteps.reduce((acc, item) => acc + item.steps, 0);

  const calculateMilestoneDays = () => {
    const sortedSteps = [...allSteps].sort((a, b) => new Date(a.formatted_date) - new Date(b.formatted_date));
    let runningTotal = 0;
    const milestoneDays = new Set();

    milestones.forEach((milestone) => {
      let milestoneAchieved = false;

      sortedSteps.forEach((item) => {
        if (!milestoneAchieved) {
          runningTotal += item.steps;
          if (runningTotal >= milestone) {
            milestoneDays.add(item.formatted_date); // Add the day the milestone was crossed
            milestoneAchieved = true; // Mark milestone as achieved
          }
        }
      });
    });

    return milestoneDays;
  };

  const milestoneDays = calculateMilestoneDays();

  console.log(milestoneDays)

  const getMonthData = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return allSteps.filter((item) => {
      const itemDate = new Date(item.formatted_date);
      return (
        itemDate.getFullYear() === year &&
        itemDate.getMonth() + 1 === month
      );
    });
  };

  const monthData = getMonthData(currentDate);


  // Calculate the maximum step count for the currently viewed month
  const maxStepsInMonth = monthData.length
    ? Math.max(...monthData.map((item) => item.steps))
    : 1;

  const daysWithData = monthData.reduce((acc, item) => {
    const dayNumber = new Date(item.formatted_date).getDate();
    acc[dayNumber] = item;
    return acc;
  }, {});

  const maxSteps = Math.max(...monthData.map((item) => item.steps));

  const getGreenShade = (steps) => {
    const intensity = Math.floor((steps / maxStepsInMonth) * 255);
    return `rgba(0, ${intensity}, 0)`;
  };

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = startOfMonth(currentDate);
  const firstWeekday = getDay(firstDayOfMonth); // 0 = Sunday, 1 = Monday, etc.
  const offset = (firstWeekday === 0 ? 6 : firstWeekday - 1); // Adjust for Monday start
  const totalSlots = daysInMonth + offset; // Total grid slots
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    const dayOfWeek = format(date, 'EEEE');
    const day = format(date, 'do');
    const month = format(date, 'MMMM');
    return `${dayOfWeek} ${day} ${month}`;
  };

  return (
    <div className="day-grid-area">
      <div className="day-grid-date-selector">
        <button onClick={() => navigateMonth(-1)}>←</button>
        <p>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => navigateMonth(1)}>→</button>
      </div>

      <div className="day-grid-both-divs">
        <div className='day-grid'>
          <p className='day-grid-days-label'>M</p>
          <p className='day-grid-days-label'>T</p>
          <p className='day-grid-days-label'>W</p>
          <p className='day-grid-days-label'>T</p>
          <p className='day-grid-days-label'>F</p>
          <p className='day-grid-days-label'>S</p>
          <p className='day-grid-days-label'>S</p>

          {Array.from({ length: totalSlots }, (_, index) => {
            const day = index - offset + 1;
            const dayData = daysWithData[day];
            const dayDate = day > 0 && day <= daysInMonth
              ? `${currentDate.getFullYear()}-${String(
                  currentDate.getMonth() + 1
                ).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              : null;

            let backgroundColor = '#040405';
            let color = '#111';

            if (dayData) {
              // if (milestoneDays.has(dayDate)) {
              //   // backgroundColor = 'gold';
              //   color = 'gold';
              // } else {
                // backgroundColor = getGreenShade(dayData.steps);
                color = getGreenShade(dayData.steps);
              //}
            }

            return (
              <div className='day'
                key={day}
                onClick={() => setSelectedDay(daysWithData[day] || null)}
                style={{
                  backgroundColor,
                  color
                }}
              >
                {dayData ? '■' : '.'}
              </div>
            );
          })}
        </div>

      {/* Right Details Panel */}
      <div className="day-details">
        {selectedDay ? (
          <>
            <p>{formatDate(selectedDay.formatted_date)}</p>
            <p>{selectedDay.steps.toLocaleString()} steps</p>
          </>
        ) : (
          <p>Select a day to see details.</p>
        )}
      </div>


      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        {allTimeTotalSteps.toLocaleString()} total steps
      </div>
    </div>
  );
};

export default DaysGrid;
