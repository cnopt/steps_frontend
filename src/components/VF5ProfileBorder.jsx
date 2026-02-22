import { useState, useEffect } from 'react';
import userService from '../services/userService';
import localDataService from '../services/localDataService';
import { milestones } from '../helpers/milestones';
import '../styles/VF5ProfileBorder.css'

export default function VF5ProfileBorder({ 
    username: propUsername, 
    showDescription = true,
    size = 'default' // 'default', 'small', 'large'
}) {
    // Determine if we're using props or local data
    const isUsingProps = propUsername !== undefined;
    
    // Get username - use prop if provided, otherwise get from userService
    const username = propUsername || userService.getUsername();
    
    // Function to get selected milestone data from localStorage (for current user)
    const getSelectedMilestoneData = () => {
        const userSelectedMilestoneValue = localDataService.getUserSelectedMilestone();
        return userSelectedMilestoneValue ? milestones.find(milestone => milestone.value === userSelectedMilestoneValue) : null;
    };
    
    // State for selected milestone data (only for non-props usage)
    const [selectedMilestoneData, setSelectedMilestoneData] = useState(() => {
        if (!isUsingProps) {
            return getSelectedMilestoneData();
        }
        return null;
    });
    
    // Function to update selected milestone data (only for non-props usage)
    const updateSelectedMilestoneData = () => {
        if (!isUsingProps) {
            const milestoneData = getSelectedMilestoneData();
            setSelectedMilestoneData(milestoneData);
        }
    };
    
    // Set up reactive updates (only for non-props usage)
    useEffect(() => {
        if (!isUsingProps) {
            // Initial load
            updateSelectedMilestoneData();
            
            // Listen for storage events and settings updates
            const handleUpdate = () => {
                updateSelectedMilestoneData();
            };
            
            window.addEventListener('storage', handleUpdate);
            window.addEventListener('settingsUpdate', handleUpdate);
            
            return () => {
                window.removeEventListener('storage', handleUpdate);
                window.removeEventListener('settingsUpdate', handleUpdate);
            };
        }
    }, [isUsingProps]);
    
    // Create style object for dynamic title image properties
    const getTitleStyle = (milestoneData) => {
        if (!milestoneData?.titleImage) return {};
        
        return {
            backgroundImage: `url(${milestoneData.titleImage})`,
            backgroundSize: milestoneData.titleImageSize || 'cover',
            backgroundPosition: milestoneData.titleImagePos || 'center'
        };
    };

    // Get size-specific class
    const getSizeClass = () => {
        switch (size) {
            case 'small': return 'vf5-profile-border-small';
            case 'large': return 'vf5-profile-border-large';
            default: return 'vf5-profile-border';
        }
    };

    return(
        <>
            <div className="profile-border-wrapper">
                <div 
                    className={getSizeClass()}
                    style={getTitleStyle(selectedMilestoneData)}
                >
                    <div className="glare"></div>
                    <p className="username">{username}</p>
                </div>
                {showDescription && !isUsingProps && (
                    <p className="profile-desc">This is how you'll show up on the leaderboards</p>
                )}
            </div>
        </>
    )
}