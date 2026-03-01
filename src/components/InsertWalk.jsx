import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Encoding } from '@capacitor/filesystem';
import localDataService from '../services/localDataService';
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
  const [closing, setClosing] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => navigate(-1), 200);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.gpx')) {
      try {
        setStatus('Processing file...');
        
        const date = new Date(selectedDate);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const newFileName = `${day}-${month}-${year}-w1.gpx`;

        try {
          await ensureWalksDirectory('walks');
        } catch (error) {
          // Directory might already exist
        }

        const fileContent = await file.text();
        
        try {
          await writeFileToWalkDirectories({
            path: `walks/${newFileName}`,
            data: fileContent,
            encoding: Encoding.UTF8
          });

          try {
            const walkName = `Uploaded Walk`;
            const result = await localDataService.addWalkToDate(selectedDate, newFileName, walkName);
            if (result.success) {
              setStatus('Upload successful! File saved as ' + newFileName);
              setTimeout(() => navigate(-1), 2000);
            } else {
              throw new Error('Failed to update steps data');
            }
          } catch (error) {
            console.error('Error updating steps data:', error);
            setStatus('Error updating steps data. Please ensure you have added steps for this date first.');
            
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
    <div className={`insert-walk-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`insert-walk-sheet ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="insert-walk-handle" />

        <div className="insert-walk-header">
          <p>
            Add Walk to <span className="insert-walk-date">{dateLabel}</span>
          </p>
        </div>

        <input
          type="file"
          accept=".gpx"
          onChange={handleFileUpload}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />

        <div className="insert-walk-actions">
          <button 
            onClick={() => navigate('/recorder', { state: { selectedDate }, replace: true })}
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
        </div>

        {status && (
          <p className={`insert-walk-status ${status.includes('successful') ? 'success' : 'error'}`}>
            {status}
          </p>
        )}
      </div>
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
  const weekday = date.toLocaleString('en-GB', { weekday: 'long' });

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