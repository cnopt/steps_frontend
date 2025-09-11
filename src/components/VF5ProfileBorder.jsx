import { useState, useEffect } from 'react';
import { GiRank2 } from "react-icons/gi";
import userService from '../services/userService';
import localDataService from '../services/localDataService';
import { badges } from '../helpers/badge-list';
import { milestones } from '../helpers/milestones';
import '../styles/VF5ProfileBorder.css'

export default function VF5ProfileBorder({ 
    username: propUsername, 
    badgeId: propBadgeId,
    showDescription = true,
    size = 'default' // 'default', 'small', 'large'
}) {
    // Determine if we're using props or local data
    const isUsingProps = propUsername !== undefined || propBadgeId !== undefined;
    
    // Get username - use prop if provided, otherwise get from userService
    const username = propUsername || userService.getUsername();
    
    // Function to get badge data by ID
    const getBadgeDataById = (badgeId) => {
        return badgeId ? badges.find(badge => badge.id === badgeId) : null;
    };
    
    // Function to get selected badge data from localStorage (for current user)
    const getSelectedBadgeData = () => {
        const userSelectedBadgeId = localDataService.getUserSelectedBadge();
        return userSelectedBadgeId ? badges.find(badge => badge.id === userSelectedBadgeId) : null;
    };
    
    // Function to get selected milestone data from localStorage (for current user)
    const getSelectedMilestoneData = () => {
        const userSelectedMilestoneValue = localDataService.getUserSelectedMilestone();
        return userSelectedMilestoneValue ? milestones.find(milestone => milestone.value === userSelectedMilestoneValue) : null;
    };
    
    // State for selected badge data
    const [selectedBadgeData, setSelectedBadgeData] = useState(() => {
        if (isUsingProps) {
            return getBadgeDataById(propBadgeId);
        } else {
            return getSelectedBadgeData();
        }
    });
    
    // State for selected milestone data (only for non-props usage)
    const [selectedMilestoneData, setSelectedMilestoneData] = useState(() => {
        if (!isUsingProps) {
            return getSelectedMilestoneData();
        }
        return null;
    });
    
    // Function to update selected badge data (only for non-props usage)
    const updateSelectedBadgeData = () => {
        if (!isUsingProps) {
            const badgeData = getSelectedBadgeData();
            setSelectedBadgeData(badgeData);
        }
    };
    
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
            updateSelectedBadgeData();
            updateSelectedMilestoneData();
            
            // Listen for storage events and settings updates
            const handleUpdate = () => {
                updateSelectedBadgeData();
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
    
    // Update badge data when propBadgeId changes
    useEffect(() => {
        if (isUsingProps) {
            setSelectedBadgeData(getBadgeDataById(propBadgeId));
        }
    }, [propBadgeId, isUsingProps]);
    
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
                    {selectedBadgeData && (
                        <div className={`profile-badge ${size}`}>
                            <img src={selectedBadgeData.image} alt={selectedBadgeData.name} />
                        </div>
                    )}
                </div>
                {showDescription && !isUsingProps && (
                    <p className="profile-desc">This is how you'll show up on the leaderboards</p>
                )}
            </div>
        </>
    )
}