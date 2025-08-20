import React, { useState, useEffect } from 'react';
import { useStepsData } from '../hooks/useStepsData';
import { format, parseISO, startOfMonth, getDay, addDays, subMonths, isSameMonth, isAfter, isBefore, endOfMonth, isSameDay } from 'date-fns';
import { milestones, calculateMilestoneDays } from '../helpers/milestones'

import XPBar from './XPBar';
import LoadingSpinner from './LoadingSpinner';
import { useWeatherData } from '../hooks/useWeatherData';
// import steps from '../assets/allstepsdata.json'
import '../styles/DaysGrid.css'
import { useLocalStorage } from '@uidotdev/usehooks';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDistance, calculateCalories } from '../helpers/calculateDistance';
import PageTransition from './PageTransition';
import { convertToHourlyBuckets, getHourlySteps } from '../helpers/timeStepsBucketing';
import HourlyStepsGraph from './HourlyStepsGraph';
import { useUserSettings } from '../hooks/useUserSettings';
import StepsInputModal from './StepsInputModal';
import HealthDataImportModal from './HealthDataImportModal';
import localDataService from '../services/localDataService';
import Today from './Today';
import { useNavigate } from 'react-router-dom';
import { getTodayLocalDateString, isToday as isTodayLocal } from '../helpers/dateUtils';

const getWeatherIcon = (weatherString) => {
  const weatherIcons = {
    'clear': '☀️',
    'clear sky': '☀️',
    'mainly clear': '☀️',
    'sunny': '☀️',
    'partly cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'fog': '🌫️',
    'mist': '🌫️',
    'drizzle': '🌦️',
    'light rain': '🌦️',
    'rain': '🌧️',
    'heavy rain': '🌧️',
    'snow': '🌨️',
    'light snow': '🌨️',
    'heavy snow': '🌨️',
    'thunderstorm': '⛈️',
    'storm': '⛈️'
  };

  return weatherIcons[weatherString.toLowerCase()] || '🌡️'; // else
};

const wasBadgeUnlockedOnDate = (date, unlockedBadges) => {
  return unlockedBadges.some(badge => badge.unlockDate === date);
};

const DaysGrid = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEmptyDay, setSelectedEmptyDay] = useState(null);
  const [unlockedBadges] = useLocalStorage('unlockedBadges', []);
  const [newlyAddedDays, setNewlyAddedDays] = useState(new Set());
  const query = useStepsData();
  const [hourlyStepsData, setHourlyStepsData] = useState(null);
  const { settings } = useUserSettings();
  const [showHealthImportModal, setShowHealthImportModal] = useState(false);
  const [hasCheckedForData, setHasCheckedForData] = useState(false);
  
  // separate dates for current month and prev (-1) month
  const { currentMonthDates, prevMonthDates } = React.useMemo(() => {
    if (!query.data || !settings.enableWeather) return { currentMonthDates: [], prevMonthDates: [] };
    
    const startOfPrevMonth = startOfMonth(subMonths(currentDate, 1));
    const endOfPrevMonth = endOfMonth(startOfPrevMonth);
    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);
    
    const currentMonthDates = [...new Set(query.data
      .filter(day => {
        const dayDate = new Date(day.formatted_date);
        return !isBefore(dayDate, startOfCurrentMonth) && !isAfter(dayDate, endOfCurrentMonth);
      })
      .map(day => new Date(day.formatted_date)))];

    const prevMonthDates = [...new Set(query.data
      .filter(day => {
        const dayDate = new Date(day.formatted_date);
        return !isBefore(dayDate, startOfPrevMonth) && !isAfter(dayDate, endOfPrevMonth);
      })
      .map(day => new Date(day.formatted_date)))];

    return { currentMonthDates, prevMonthDates };
  }, [query.data, settings.enableWeather, currentDate]);

  // separate queries for current and previous (-1) month
  const currentMonthWeatherQuery = useWeatherData(currentMonthDates);
  const prevMonthWeatherQuery = useWeatherData(prevMonthDates);

  // combine weather data from both queries
  const weatherData = React.useMemo(() => {
    if (!settings.enableWeather) return null;
    
    return {
      ...prevMonthWeatherQuery.data,
      ...currentMonthWeatherQuery.data
    };
  }, [settings.enableWeather, prevMonthWeatherQuery.data, currentMonthWeatherQuery.data]);

  useEffect(() => {
    if (query.data) {
        const bucketedData = convertToHourlyBuckets(query.data);
        console.log('Bucketed Data:', bucketedData);
        console.log('Selected Day:', selectedDay?.formatted_date);
        setHourlyStepsData(bucketedData);
    }
  }, [query.data]);

  // Check if user has any steps data and show import modal if needed
  useEffect(() => {
    if (!hasCheckedForData && query.data !== undefined) {
      setHasCheckedForData(true);
      
      // Check if user has any steps data
      const hasStepsData = localDataService.hasAnyStepsData();
      
      if (!hasStepsData) {
        // Show health import modal for new users
        setShowHealthImportModal(true);
      }
    }
  }, [query.data, hasCheckedForData]);

  // only show loading for steps data or current month weather data + if enabled
  if (query.isLoading || (settings.enableWeather && currentMonthWeatherQuery.isLoading)) return <LoadingSpinner/>;
  if (query.isError) return <div>Error fetching steps data.</div>;
  if (settings.enableWeather && currentMonthWeatherQuery.isError) return <div>Error fetching weather data.</div>;


  const allSteps = query.data; // steps from API
  //const allSteps = steps.dev;

  const allTimeTotalSteps = allSteps.reduce((acc, item) => acc + item.steps, 0);

  // Get today's step data (using local timezone)
  const todayISO = getTodayLocalDateString();
  const todaysData = allSteps.find(day => day.formatted_date === todayISO);
  const todaysSteps = todaysData ? todaysData.steps : 0;

  const milestoneDays = calculateMilestoneDays({allSteps});

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
    return `rgba(0, ${intensity}, 20)`;
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
    const month = format(date, 'MMM');
    return `${dayOfWeek}, ${day} ${month}`;
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common':
        return 'gold'; // was silver but now just use gold
      case 'uncommon':
        return 'gold';
      case 'rare':
        return 'blueviolet';
      default:
        return '#c0c0c0';
    }
  };

  const isHourlyStepsEnabled = true

  return (
    <>
      <XPBar/>
      <Today 
        todaysSteps={todaysSteps}
        isLoading={query.isLoading}
      />
        <div className="day-grid-area">
          <div className="day-grid-date-selector">
            <button className="prev" onClick={() => navigateMonth(-1)}>←</button>
            <p>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              <br />
              <p className="month-total-steps">
                {monthData.reduce((sum, day) => sum + day.steps, 0).toLocaleString()} steps
                {/* {calculateDistance(monthData.reduce((sum,day) => sum + day.steps, 0))} miles */}
              </p>
            </p>
            <button className="next" onClick={() => navigateMonth(1)}>→</button>
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
                let color = '#444';

                // Check if this is today's date (using local timezone)
                const isToday = dayDate && isTodayLocal(dayDate);

                if (dayData) {
                  if (milestoneDays.has(dayDate)) {
                    const milestone = milestoneDays.get(dayDate);
                    if (milestone.rarity === 'rare') {
                      color = 'blueviolet';
                    } else {
                      color = getGreenShade(dayData.steps);
                    }
                  } else {
                    color = getGreenShade(dayData.steps);
                  }
                }

                // Override color for today's date only if no steps data
                if (isToday && !dayData) {
                  color = '#fff';
                  //color = '#ff7608';
                }

                const handleDayClick = () => {
                  if (daysWithData[day]) {
                    // Day has data - show day details
                    setSelectedDay(daysWithData[day]);
                    setSelectedEmptyDay(null);
                  } else if (day > 0 && day <= daysInMonth) {
                    // Day has no data and is a valid day - show input
                    setSelectedEmptyDay(dayDate);
                    setSelectedDay(null);
                  }
                };

                const isNewlyAdded = newlyAddedDays.has(dayDate);

                return (
                  <div className='day'
                    key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${index}`}
                    onClick={handleDayClick}
                    style={{
                      backgroundColor,
                      color,
                      position: 'relative',
                      cursor: (day > 0 && day <= daysInMonth) ? 'pointer' : 'default',
                      opacity: (day <= 0 || day > daysInMonth) ? 0.2 : 1
                    }}
                  >
                    {dayData && (
                      <>
                        {/* {milestoneDays.has(dayDate) && milestoneDays.get(dayDate).rarity !== 'rare' && (
                          <div 
                            className="milestone-indicator"
                            style={{
                              position: 'absolute',
                              top: '3px',
                              left: '3px',
                              width: '8px',
                              height: '3px',
                              backgroundColor: 'gold',
                              borderRadius: '1px',
                              zIndex: 3
                            }}
                          />
                        )} */}
                        {unlockedBadges
                          .filter(badge => badge.unlockDate === dayDate)
                          .map((badge, index) => (
                            <div 
                              key={badge.id}
                              style={{
                                position: 'absolute',
                                top: `${8 + (index * 9)}px`, // if more than one badge, move down properly
                                left: '3px',
                                width: '6px',
                                height: '6px',
                                backgroundColor: 'gold',
                                borderRadius: '50%',
                                zIndex: 2,
                                border:'1px solid black'
                              }}
                            />
                          ))}
                      </>
                    )}
                    {/* circle for selected day */}
                    {selectedDay && dayDate === selectedDay.formatted_date && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#040405',
                          borderRadius: '50%',
                          zIndex: 4,
                          fontFamily:'sf-mono',
                          color:'black',
                          fontSize:'0.65em'
                        }}
                      ></motion.div>
                    )}
                    {/* ■ for days with data, pop in if newly added */}
                    {dayData ? (
                      <motion.span
                        key={`${dayDate}-filled`}
                        initial={isNewlyAdded ? { opacity: 0, y: 10 } : false}
                        animate={isNewlyAdded ? { 
                          opacity: 1,
                          y: 0
                        } : { opacity: 1, y: 0 }}
                        transition={isNewlyAdded ? {
                          duration: 0.4,
                          ease:'easeOut'
                        } : { duration: 0 }}
                        onAnimationComplete={() => {
                          if (isNewlyAdded) {
                            setNewlyAddedDays(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(dayDate);
                              return newSet;
                            });
                          }
                        }}
                        style={{ display: 'inline-block' }}
                      >
                        ■
                      </motion.span>
                    ) : (
                      '·'
                    )}
                  </div>
                );
              })}
            </div>

          <AnimatePresence mode="wait">
            <motion.div 
              className="day-details"
              key={selectedDay ? selectedDay.formatted_date : selectedEmptyDay ? selectedEmptyDay : 'empty'}
              initial={{ opacity: 0, y: 5, x: 0 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 0 }}
              transition={{ duration: 0.1 }}
            >
              {selectedDay ? (
                <>
                  <div className='day-details-top-row'>
                    <p>
                      <span className='icon'></span> <span className='day-details-top-row-date'>{formatDate(selectedDay.formatted_date)}</span>
                    </p>
                    {settings.enableWeather && weatherData && weatherData[selectedDay.formatted_date] && (
                      <p>
                        <span className='weather-icon'>
                          {getWeatherIcon(weatherData[selectedDay.formatted_date].weather_code)}
                        </span>
                        <span style={{ fontSize: '0.8em', color: '#999', fontFamily:'sf' }}>
                          {weatherData[selectedDay.formatted_date].temperature_max}°C
                        </span>
                      </p>
                    )}
                  </div>
                  <div className='day-details-second-row'>
                    <p>
                      <span className='icon'>󰖃</span>
                      <span className='day-details-steps'>{selectedDay.steps.toLocaleString()} steps</span>
                    </p>
                    <p>
                      <span className='icon'>󰞁</span>
                      <span className='day-details-distance'>
                        {calculateDistance(selectedDay.steps)} mi
                      </span>
                    </p>
                  </div>
                  {/* <div className='day-details-third-row'>
                    <p>
                        <span className='icon'>󰈸</span>
                        <span className='day-details-calories'>
                          {calculateCalories(selectedDay.steps)} cal
                        </span>
                    </p>
                  </div> */}
                  {milestoneDays.has(selectedDay.formatted_date) && (
                    <div className='day-details-milestones'>
                      <p className='day-details-milestone'>
                        <span>★</span>
                        <span style={{ color: getRarityColor(milestoneDays.get(selectedDay.formatted_date).rarity), fontSize:'0.8em' }}>
                          {milestoneDays.get(selectedDay.formatted_date).value.toLocaleString()} steps milestone
                        </span>
                      </p>
                    </div>
                  )}

                  {wasBadgeUnlockedOnDate(selectedDay.formatted_date, unlockedBadges) && (
                    <div className='day-details-badges'>
                      <div className='day-details-badge'>
                        {unlockedBadges
                          .filter(badge => badge.unlockDate === selectedDay.formatted_date)
                          .map(badge => (
                            <p key={badge.id}>
                              <span style={{color:'gold'}}>󰻂</span>
                              <span style={{ color: 'gold', fontSize:'0.8em'}}>
                                {badge.name} unlocked
                              </span>
                            </p>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Walk Buttons */}
                  <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedDay.walks?.length > 0 && (
                      <button
                        onClick={() => navigate('/walkview', { 
                          state: { 
                            date: selectedDay.formatted_date,
                            walkFile: selectedDay.walks[0].filename // For now, just use the first walk
                          }
                        })}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#2ecc71',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          fontFamily: 'sf'
                        }}
                      >
                        View Walk
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/insert-walk', { state: { selectedDate: selectedDay.formatted_date } })}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#037bfc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        fontFamily: 'sf'
                      }}
                    >
                      Add Walk
                    </button>
                  </div>

                  {isHourlyStepsEnabled && hourlyStepsData && selectedDay && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <HourlyStepsGraph 
                            hourlySteps={hourlyStepsData[selectedDay.formatted_date]?.simulatedHourlySteps}
                            sunsetTime={settings.enableWeather ? weatherData?.[selectedDay.formatted_date]?.sunset : undefined}
                        />
                    </motion.div>
                  )}
                </>
              ) : selectedEmptyDay ? (
                // hide "Select a day" text when modal is open
                null
              ) : (
                <p>Select a day to see details.</p>
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        {/* Steps Input Modal */}
        <StepsInputModal
          isOpen={!!selectedEmptyDay}
          selectedDate={selectedEmptyDay}
          onSuccess={(response) => {
            // Mark the day as newly added for animation
            setNewlyAddedDays(prev => new Set(prev).add(selectedEmptyDay));
            
            // Clear the selected empty day
            setSelectedEmptyDay(null);
            
            // Auto-select the newly created day after a brief delay to allow data refresh
            setTimeout(() => {
              const newDayData = {
                ...response.data_added,
                steps: response.data_added.steps
              };
              setSelectedDay(newDayData);
            }, 100);
          }}
          onClose={() => {
            setSelectedEmptyDay(null);
          }}
        />

        {/* Health Data Import Modal */}
        <HealthDataImportModal
          isOpen={showHealthImportModal}
          onSuccess={(result) => {
            console.log('Health data import successful:', result);
            setShowHealthImportModal(false);
          }}
          onClose={() => {
            setShowHealthImportModal(false);
          }}
        />
    </>
  );
};

export default DaysGrid;
