// User Service - Manages user identification, usernames, and profile data

class UserService {
  constructor() {
    this.initializeUser();
  }

  // Generate a unique random user ID (6-digit number)
  generateUserId() {
    return Math.floor(100000 + Math.random() * 900000);
  }

  // Initialize user if doesn't exist
  initializeUser() {
    const profile = this.getUserProfile();
    
    // If no user ID exists, generate one
    if (!profile.userId) {
      const userId = this.generateUserId();
      this.updateUserProfile({ 
        userId,
        username: `User${userId}`, // Default username
        createdAt: new Date().toISOString()
      });
    }
  }

  // Get user profile from localStorage (delegated to localDataService)
  getUserProfile() {
    try {
      const profile = localStorage.getItem('userProfile');
      return JSON.parse(profile) || {};
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {};
    }
  }

  // Update user profile
  updateUserProfile(profileData) {
    try {
      const currentProfile = this.getUserProfile();
      const updatedProfile = {
        ...currentProfile,
        ...profileData,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      return {
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get current user ID
  getUserId() {
    const profile = this.getUserProfile();
    return profile.userId || null;
  }

  // Get current username
  getUsername() {
    const profile = this.getUserProfile();
    return profile.username || `User${profile.userId}`;
  }

  // Update username (must be 3-20 characters, alphanumeric + underscores)
  updateUsername(newUsername) {
    if (!this.isValidUsername(newUsername)) {
      throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
    }

    return this.updateUserProfile({ username: newUsername });
  }

  // Validate username format
  isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username.length < 3 || username.length > 10) return false;
    return /^[a-zA-Z0-9_]+$/.test(username);
  }

  // Get user data for database operations
  getUserDataForDatabase() {
    const profile = this.getUserProfile();
    return {
      user_id: profile.userId,
      username: profile.username || `User${profile.userId}`
    };
  }

  // Reset user (generate new ID and username)
  resetUser() {
    const newUserId = this.generateUserId();
    return this.updateUserProfile({
      userId: newUserId,
      username: `User${newUserId}`,
      createdAt: new Date().toISOString()
    });
  }
}

// Create and export singleton instance
const userService = new UserService();
export default userService; 