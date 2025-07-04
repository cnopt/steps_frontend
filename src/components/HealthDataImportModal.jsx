import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import HealthService from '../services/healthService';
import localDataService from '../services/localDataService';
import '../styles/HealthDataImportModal.css';

const HealthDataImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [healthStatus, setHealthStatus] = useState({
    isAvailable: null,
    hasPermissions: null,
    isLoading: false,
    error: null
  });
  
  const [importStatus, setImportStatus] = useState({
    isImporting: false,
    progress: 0,
    total: 0,
    currentStatus: '',
    completed: false,
    importedCount: 0
  });

  const [selectedRange, setSelectedRange] = useState('3months');

  const queryClient = useQueryClient();

  // Data range options - using 30-day blocks (Health Connect constraint)
  const dataRangeOptions = [
    { value: '3months', label: 'Last 3 months', blocks: 4 },
    { value: '6months', label: 'Last 6 months', blocks: 7 },
    { value: '1year', label: 'Last year', blocks: 13 }
  ];

  // Check health status when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeHealthCheck();
    }
  }, [isOpen]);

  // Helper function to get 30-day date ranges with proper midnight boundaries
  const get30DayBlocks = (totalBlocks) => {
    const blocks = [];
    const now = new Date();
    
    for (let i = 0; i < totalBlocks; i++) {
      // Calculate end date for this block (working backwards from now)
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - (i * 30));
      
      // Set end date to end of day (23:59:59.999)
      endDate.setHours(23, 59, 59, 999);
      
      // Calculate start date (30 days before end date)
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 29); // 30 days total (inclusive)
      
      // Set start date to beginning of day (00:00:00.000)
      startDate.setHours(0, 0, 0, 0);
      
      // Format dates as YYYY-MM-DD for consistent handling
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];
      
      blocks.push({
        startDate: startDateString,
        endDate: endDateString,
        startDateISO: startDate.toISOString(),
        endDateISO: endDate.toISOString(),
        label: `${startDateString} to ${endDateString}`
      });
    }
    
    return blocks.reverse(); // Start with oldest first
  };

  const initializeHealthCheck = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if Health Connect is available
      const availabilityResult = await HealthService.isHealthAvailable();
      const isAvailable = availabilityResult?.available || false;
      
      let hasPermissions = false;
      if (isAvailable) {
        // Check permissions if available
        const permissionResult = await HealthService.checkHealthPermissions();
        hasPermissions = permissionResult?.permissions && 
          Object.values(permissionResult.permissions).some(granted => granted);
      }
      
      setHealthStatus({
        isAvailable,
        hasPermissions,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setHealthStatus(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to check health status: ${error.message}`
      }));
    }
  };

  const handleRequestPermissions = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await HealthService.requestHealthPermissions();
      const hasPermissions = result?.permissions && 
        Object.values(result.permissions).some(granted => granted);
      
      setHealthStatus(prev => ({
        ...prev,
        hasPermissions,
        isLoading: false
      }));
      
      if (!hasPermissions) {
        setHealthStatus(prev => ({
          ...prev,
          error: 'Permissions were not granted. Please enable step permissions in Health Connect settings.'
        }));
      }
    } catch (error) {
      setHealthStatus(prev => ({
        ...prev,
        isLoading: false,
        error: `Permission request failed: ${error.message}`
      }));
    }
  };

  const handleStartImport = async () => {
    try {
      const selectedOption = dataRangeOptions.find(option => option.value === selectedRange);
      const dateBlocks = get30DayBlocks(selectedOption.blocks);

      setImportStatus({
        isImporting: true,
        progress: 0,
        total: dateBlocks.length,
        currentStatus: 'Preparing import...',
        completed: false,
        importedCount: 0
      });

      const allImportedData = [];
      let currentIndex = 0;

      for (const block of dateBlocks) {
        try {
          setImportStatus(prev => ({
            ...prev,
            progress: currentIndex,
            currentStatus: `Fetching data: ${block.label}`
          }));

          // Get data for this 30-day block using ISO dates
          const blockData = await HealthService.getStepsData(block.startDateISO, block.endDateISO);
          const transformedData = HealthService.transformHealthDataToLocalFormat(blockData);
          
          allImportedData.push(...transformedData);
          
          currentIndex++;
          setImportStatus(prev => ({
            ...prev,
            progress: currentIndex,
            currentStatus: `Completed: ${block.label} (${transformedData.length} days)`
          }));
          
          // Add a small delay between requests to be respectful
          if (currentIndex < dateBlocks.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.error(`Failed to fetch data for block ${block.label}:`, error);
          setImportStatus(prev => ({
            ...prev,
            currentStatus: `Failed: ${block.label} - ${error.message}`
          }));
          // Continue with other blocks even if one fails
          currentIndex++;
        }
      }

      // Store the imported data in local storage
      let storedCount = 0;
      setImportStatus(prev => ({
        ...prev,
        currentStatus: 'Storing data locally...'
      }));

      for (const dayData of allImportedData) {
        try {
          await localDataService.addStepsData(dayData);
          storedCount++;
        } catch (error) {
          console.warn(`Failed to store data for ${dayData.formatted_date}:`, error);
        }
      }

      setImportStatus(prev => ({
        ...prev,
        isImporting: false,
        completed: true,
        importedCount: storedCount,
        currentStatus: `Successfully imported ${storedCount} day(s) of data from ${selectedOption.label.toLowerCase()}`
      }));

      // Invalidate and refetch the steps data
      queryClient.invalidateQueries({ queryKey: ['stepsData'] });
      
      // Call success callback after a brief delay
      setTimeout(() => {
        onSuccess?.({ success: true, importedData: allImportedData, totalDays: storedCount });
      }, 1500);

    } catch (error) {
      setImportStatus(prev => ({
        ...prev,
        isImporting: false,
        completed: false,
        currentStatus: `Import failed: ${error.message}`
      }));
    }
  };

  const getStatusColor = (status) => {
    if (status === true) return 'success';
    if (status === false) return 'error';
    return 'unknown';
  };

  const canStartImport = healthStatus.isAvailable && healthStatus.hasPermissions && !importStatus.isImporting;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="health-import-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && !importStatus.isImporting && onClose?.()}
        >
          <motion.div
            className="health-import-modal"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="modal-header">
              <h2>Import Health Data</h2>
              <p>To display your steps, Stepno will connect to your Health Connect data</p>
            </div>

            <div className="modal-content">
              {/* Health Status Section */}
              <div className="health-status-section">
                <div className="status-grid">
                  <div className="hc-status-item">
                    <span className={`status-label ${getStatusColor(healthStatus.isAvailable)}`}>➊ Available</span>
                    <span className={`status-value ${getStatusColor(healthStatus.isAvailable)}`}>
                      {healthStatus.isAvailable === null ? '...' : healthStatus.isAvailable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="hc-status-item">
                    <span className={`status-label ${getStatusColor(healthStatus.hasPermissions)}`}>➋ Permissions</span>
                    <span className={`status-value ${getStatusColor(healthStatus.hasPermissions)}`}>
                      {healthStatus.hasPermissions === null ? '...' : healthStatus.hasPermissions ? 'Granted' : 'Not granted'}
                    </span>
                  </div>
                </div>

                {healthStatus.error && (
                  <div className="error-message">
                    {healthStatus.error}
                  </div>
                )}
              </div>

              {/* Data Range Selection */}
              {healthStatus.isAvailable && healthStatus.hasPermissions && (
                <div className="data-range-section">
                  <h3>Select Data Range</h3>
                  <div className="range-selector">
                    <select 
                      value={selectedRange} 
                      onChange={(e) => setSelectedRange(e.target.value)}
                      disabled={importStatus.isImporting}
                      className="range-dropdown"
                    >
                      {dataRangeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.blocks} blocks)
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="range-description">
                    Data will be fetched in 30-day blocks to ensure complete coverage.
                  </p>
                </div>
              )}

              {/* Action Buttons Section */}
              <div className="actions-section">
                {!healthStatus.isAvailable ? (
                  <div className="no-health-connect">
                    <p>Health Connect is not available on this device.</p>
                    <button 
                      className="modal-button secondary"
                      onClick={() => HealthService.showHealthConnectInPlayStore()}
                    >
                      Install Health Connect
                    </button>
                  </div>
                ) : !healthStatus.hasPermissions ? (
                  <div className="permission-section">
                    <p>We need permission to read your step data from Health Connect.</p>
                    <button 
                      className="modal-button primary"
                      onClick={handleRequestPermissions}
                      disabled={healthStatus.isLoading}
                    >
                      {healthStatus.isLoading ? 'Checking...' : 'Grant Permissions'}
                    </button>
                  </div>
                ) : (
                  <div className="import-section">
                    <p>Ready to import your step data from Health Connect.</p>
                    <button 
                      className="modal-button primary"
                      onClick={handleStartImport}
                      disabled={!canStartImport}
                    >
                      {importStatus.isImporting ? 'Importing...' : 'Start Import'}
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Section */}
              {(importStatus.isImporting || importStatus.completed) && (
                <motion.div
                  className="progress-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <h3>Import Progress</h3>
                  
                  {importStatus.total > 0 && (
                    <div className="progress-bar-container">
                      <div className="progress-bar">
                        <motion.div 
                          className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${(importStatus.progress / importStatus.total) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="progress-text">
                        {importStatus.progress} / {importStatus.total} blocks
                      </span>
                    </div>
                  )}
                  
                  <div className="status-text">
                    {importStatus.currentStatus}
                  </div>

                  {importStatus.completed && importStatus.importedCount > 0 && (
                    <motion.div 
                      className="success-message"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      ✓ Successfully imported {importStatus.importedCount} day(s) of step data!
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={onClose}
                disabled={importStatus.isImporting}
              >
                {importStatus.completed ? 'Continue' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HealthDataImportModal; 