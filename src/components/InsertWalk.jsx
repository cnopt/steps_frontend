import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import localDataService from '../services/localDataService';

const InsertWalk = () => {
  const location = useLocation();
  const selectedDate = location.state?.selectedDate;
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
          await Filesystem.mkdir({
            path: 'walks',
            directory: Directory.Documents,
            recursive: true
          });
        } catch (error) {
          // Directory might already exist, continue
        }

        // Read the file content
        const fileContent = await file.text();
        
        // Save the file using Capacitor's Filesystem API
        try {
          await Filesystem.writeFile({
            path: `walks/${newFileName}`,
            data: fileContent,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          });

          // Update local storage with the walk reference
          try {
            const result = await localDataService.addWalkToDate(selectedDate, newFileName);
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
              await Filesystem.deleteFile({
                path: `walks/${newFileName}`,
                directory: Directory.Documents
              });
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
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h3>Upload Walk for {selectedDate}</h3>
      
      <input
        type="file"
        accept=".gpx"
        onChange={handleFileUpload}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      
      <button 
        onClick={() => navigate('/recorder', { state: { selectedDate } })}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Start Recording Walk
      </button>

      <button 
        onClick={() => fileInputRef.current.click()}
        style={{
          padding: '10px 20px',
          backgroundColor: '#037bfc',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '10px',
          width: '100%'
        }}
      >
        Select GPX File
      </button>

      

      {status && (
        <p style={{ 
          marginTop: '20px',
          padding: '10px',
          backgroundColor: status.includes('successful') ? '#4CAF50' : '#f44336',
          color: 'white',
          borderRadius: '5px'
        }}>
          {status}
        </p>
      )}

      <button 
        onClick={() => navigate(-1)}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: 'transparent',
          color: '#666',
          border: '1px solid #666',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default InsertWalk;