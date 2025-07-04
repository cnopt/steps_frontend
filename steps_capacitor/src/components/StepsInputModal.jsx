import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from "@tanstack/react-query";
import { useAddStepsData } from '../hooks/useStepsData';
import { useAchievementChecker } from '../hooks/useAchievementChecker';
import AchievementNotification from './AchievementNotification';
import '../styles/NumberInput.css'; // Reuse existing styles

const StepsInputModal = ({ isOpen, selectedDate, onSuccess, onClose }) => {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { addStepsData } = useAddStepsData();
  const { 
    checkForNewAchievements, 
    achievementNotifications, 
    clearNotifications, 
    dismissNotification 
  } = useAchievementChecker();

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleButtonClick = (value) => {
    setInputValue((prev) => prev + value);
  };

  const handleBackspace = () => {
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleEnter = async () => {
    if (!inputValue || parseInt(inputValue) === 0) {
      return;
    }

    setIsSubmitting(true);
    
    const data = {
      steps: parseInt(inputValue),
      formatted_date: selectedDate,
    };
    
    try {
      const response = await addStepsData(data);
      
      // Invalidate and refetch the steps data
      await queryClient.invalidateQueries({
        queryKey: ['stepsData'],
        refetchType: 'all'
      });

      // Wait for the query to refetch, then check for new achievements
      const updatedStepsData = queryClient.getQueryData(['stepsData']);
      if (updatedStepsData) {
        await checkForNewAchievements(updatedStepsData);
      }
      
      if (onSuccess) {
        onSuccess(response);
      }
      
      setInputValue("");
      onClose();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
    const formattedDate = new Intl.DateTimeFormat("en-GB", options).format(date);

    const day = date.getDate();
    let suffix = "th";
    if (day % 10 === 1 && day !== 11) suffix = "st";
    else if (day % 10 === 2 && day !== 12) suffix = "nd";
    else if (day % 10 === 3 && day !== 13) suffix = "rd";

    return formattedDate.replace(day,`${day}${suffix}`);
  };

  const formatFullDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
    const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
    const day = date.getDate();
    
    let suffix = "th";
    if (day % 10 === 1 && day !== 11) suffix = "st";
    else if (day % 10 === 2 && day !== 12) suffix = "nd";
    else if (day % 10 === 3 && day !== 13) suffix = "rd";

    return `${weekday} ${day}${suffix} ${month}`;
  };

  const formatNumberWithCommas = (num) => {
    if (!num) return "";
    return parseInt(num).toLocaleString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={!isSubmitting ? onClose : undefined}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1000,
              cursor: !isSubmitting ? 'pointer' : 'default'
            }}
          />

          {/* Modal Card - Fixed positioning for proper mobile centering */}
          <motion.div
            initial={{ y: '30%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '50%', opacity: 0 }}
            transition={{ 
              type: 'spring',
              damping: 40,
              stiffness: 400,
              duration: 0.2
            }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              margin: '0 auto',
              width: '100%',
              maxWidth: '265px',
              minWidth: '250px',
              backgroundColor: '#111',
              borderRadius: '12px 12px 0 0',
              zIndex: 1001,
              // Center on all screen sizes
              transform: 'translateX(calc(50vw - 50%))'
            }}
            onClick={(e) => e.stopPropagation()} // Prevent click-through to backdrop
          >
            {/* Close button X in top corner */}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                width: '24px',
                height: '24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '50%',
                color: '#666',
                cursor: 'pointer',
                fontSize: '1.7em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1002
              }}
            >
              ×
            </button>

            {/* Handle bar */}
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#666',
              borderRadius: '2px',
              margin: '0 auto 16px auto',
              marginTop: '12px'
            }} />

            {/* Use the exact same container class as NumberInput */}
            <div className="container" style={{ marginTop: 0, marginBottom: '1rem' }}>
              {/* Header using dateNav styling */}
              <div className="dateNav" style={{ 
                justifyContent: 'center', 
                marginBottom: '0.3rem',
                opacity: 1,
                color: '#4493f8'
              }}>
                <span style={{fontSize:'0.8rem',opacity:'0.3',marginBottom:'0.4rem',color:'#fff'}}>Add steps data for:</span>
                <span>{formatFullDisplayDate(selectedDate)}</span>
              </div>

              {/* Use exact same inputBox class */}
              <input 
                className="inputBox"
                type="text"
                value={formatNumberWithCommas(inputValue)}
                readOnly
              />
              
              {/* Use exact same buttonGrid class */}
              <div className="buttonGrid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleButtonClick(num.toString())}
                    disabled={isSubmitting}
                  >
                    {num}
                  </button>
                ))}
                <button 
                  className="backspace" 
                  onClick={handleBackspace} 
                  disabled={isSubmitting}
                >
                  󰁮
                </button>
                <button 
                  className="enter" 
                  onClick={handleEnter} 
                  disabled={isSubmitting || !inputValue}
                  style={{
                    opacity: (!inputValue || isSubmitting) ? 0.25 : 1
                  }}
                >
                  {isSubmitting ? '...' : '󰦺'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
      
      {/* Achievement Notifications */}
      <AchievementNotification
        achievements={achievementNotifications}
        onDismiss={dismissNotification}
        onClearAll={clearNotifications}
        autoDismissTime={1200000}
      />
    </AnimatePresence>
  );
};

export default StepsInputModal; 