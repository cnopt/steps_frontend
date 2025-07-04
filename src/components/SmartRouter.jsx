import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import localDataService from '../services/localDataService';

const SmartRouter = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only run smart routing logic on app load, not on every route change
    if (location.pathname === '/') {
      const onboardingStatus = localDataService.getOnboardingStatus();
      
      if (onboardingStatus.isFirstTime) {
        // First-time user - route to calendar grid page
        navigate('/month', { replace: true });
      } else if (onboardingStatus.hasStepsData) {
        // Returning user with data - go to their main view
        navigate('/month', { replace: true });
      } else {
        // Edge case - route to calendar grid
        navigate('/month', { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  return children;
};

export default SmartRouter; 