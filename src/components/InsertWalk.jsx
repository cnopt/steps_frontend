import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Encoding } from '@capacitor/filesystem';
import localDataService from '../services/localDataService';
import PageTransition from './PageTransition';
import { getLocalDateString, getTodayLocalDateString } from '../helpers/dateUtils';
import {
  ensureWalksDirectory,
  writeFileToWalkDirectories,
  deleteFileFromWalkDirectories
} from '../helpers/walkStorage';
import '../styles/InsertWalk.css';

const InsertWalk = () => {
  const location = useLocation();
  const selectedDate = location.state?.selectedDate;
  const dateLabel = formatInsertWalkDate(selectedDate);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.gpx')) {
      try {
        setStatus('Processing file...');
        
        // Format the date for the new filename
        const date = new Date(selectedDate);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const newFileName = `${day}-${month}-${year}-w1.gpx`;

        // Create the walks directory if it doesn't exist
        try {
          await ensureWalksDirectory('walks');
        } catch (error) {
          // Directory might already exist, continue
        }

        // Read the file content
        const fileContent = await file.text();
        
        // Save the file using Capacitor's Filesystem API
        try {
          await writeFileToWalkDirectories({
            path: `walks/${newFileName}`,
            data: fileContent,
            encoding: Encoding.UTF8
          });

          // Update local storage with the walk reference
          try {
            // Create a default walk name for uploaded files
            const walkName = `Uploaded Walk`;
            const result = await localDataService.addWalkToDate(selectedDate, newFileName, walkName);
            if (result.success) {
              setStatus('Upload successful! File saved as ' + newFileName);
              // Wait a bit before navigating back
              setTimeout(() => navigate(-1), 2000);
            } else {
              throw new Error('Failed to update steps data');
            }
          } catch (error) {
            console.error('Error updating steps data:', error);
            setStatus('Error updating steps data. Please ensure you have added steps for this date first.');
            
            // Clean up the file since we couldn't update the steps data
            try {
              await deleteFileFromWalkDirectories(`walks/${newFileName}`);
            } catch (cleanupError) {
              console.error('Error cleaning up file:', cleanupError);
            }
          }
        } catch (error) {
          console.error('File write error:', error);
          setStatus('Error saving file. Please try again.');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setStatus('Error processing file. Please try again.');
      }
    } else {
      setStatus('Please select a GPX file.');
    }
  };

  return (
    <div className="insert-walk-page">
      <PageTransition>
        <div className="insert-walk-transition">
          <div className="insert-walk-container">
            <div className="insert-walk-header">
              <p>
                Add walk for <span className="insert-walk-date">{dateLabel}</span>
              </p>
            </div>
          
          <input
            type="file"
            accept=".gpx"
            onChange={handleFileUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          
          <button 
            onClick={() => navigate('/recorder', { state: { selectedDate } })}
            className="insert-walk-record-btn"
          >
            <span>󰖃</span> Start Recording Walk
          </button>

          <button 
            onClick={() => fileInputRef.current.click()}
            className="insert-walk-select-btn"
          >
            Import GPX File
          </button>

          <button
            type="button"
            className="insert-walk-close-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            ✕
          </button>

          

            {status && (
              <p className={`insert-walk-status ${status.includes('successful') ? 'success' : 'error'}`}>
                {status}
              </p>
            )}
          </div>
        </div>
      </PageTransition>
    </div>
  );
};

function formatInsertWalkDate(dateString) {
  if (!dateString) {
    return 'today';
  }

  if (dateString === getTodayLocalDateString()) {
    return 'today';
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === getLocalDateString(yesterday)) {
    return 'yesterday';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });

  const remainder10 = day % 10;
  const remainder100 = day % 100;
  let suffix = 'th';
  if (remainder10 === 1 && remainder100 !== 11) {
    suffix = 'st';
  } else if (remainder10 === 2 && remainder100 !== 12) {
    suffix = 'nd';
  } else if (remainder10 === 3 && remainder100 !== 13) {
    suffix = 'rd';
  }

  return `${day}${suffix} ${month}`;
}

export default InsertWalk;