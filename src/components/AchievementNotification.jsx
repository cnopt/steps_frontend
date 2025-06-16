import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import '../styles/AchievementNotification.css';

const AchievementNotification = ({ 
  achievements, 
  onDismiss, 
  onClearAll,
  autoDismissTime = 5000 
}) => {
  // Auto-dismiss notifications after specified time
  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(() => {
        onClearAll();
      }, autoDismissTime);
      
      return () => clearTimeout(timer);
    }
  }, [achievements, onClearAll, autoDismissTime]);

  // Check if there are any milestones in the achievements
  const hasMilestones = achievements.some(achievement => achievement.type === 'milestone');
  const hasOnlyMilestones = achievements.every(achievement => achievement.type === 'milestone');
  const hasOnlyBadges = achievements.every(achievement => achievement.type === 'badge');

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'silver';
      case 'uncommon': return 'gold';
      case 'rare': return 'blueviolet';
      default: return 'gold';
    }
  };

  const getAchievementIcon = (type) => {
    switch (type) {
      case 'badge': return '󰻂';
      case 'milestone': return '★';
      default: return '🏆';
    }
  };

  return (
    <AnimatePresence mode="sync">
      {achievements.length > 0 && (
        <motion.div
          className={`achievement-notifications-container ${hasMilestones ? 'has-milestones' : ''} ${hasOnlyMilestones ? 'milestone-theme' : ''}`}
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -200 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 40,
            duration: 0.8,
            delay: 0.3
          }}
        >
          <div className="achievement-notifications-header">
            <h3>
              {hasOnlyMilestones 
                ? `Milestone${achievements.length > 1 ? 's' : ''} Unlocked`
                : hasOnlyBadges 
                ? `Badge${achievements.length > 1 ? 's' : ''} Unlocked`
                : `Achievement${achievements.length > 1 ? 's' : ''} Unlocked`
              }
            </h3>
            <button 
              className="close-all-btn"
              onClick={onClearAll}
              aria-label="Close all notifications"
            >
              ×
            </button>
          </div>
          
          <motion.div 
            className="achievement-notifications-list"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {achievements.map((achievement, index) => (
              <motion.div
                key={`${achievement.type}-${achievement.id || achievement.value}-${index}`}
                className={`achievement-notification-item ${achievement.type}`}
                onClick={() => onDismiss(index)}
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1 }
                }}
                transition={{ duration: 0.4 }}
              >
                {achievement.type !== 'milestone' && (
                  <motion.div 
                    className="achievement-icon"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                  >
                    {achievement.image ? (
                      <img 
                        src={achievement.image} 
                        alt={achievement.name}
                        className="achievement-image"
                        onError={(e) => {
                          // Fallback to text icon if image fails to load
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'inline';
                        }}
                      />
                    ) : null}
                    <span 
                      className="achievement-icon-fallback"
                      style={{ 
                        color: 'gold',
                        display: achievement.image ? 'none' : 'inline'
                      }}
                    >
                      {getAchievementIcon(achievement.type)}
                    </span>
                  </motion.div>
                )}
                
                <div className="achievement-details">
                  <motion.div 
                    className="achievement-name"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    {achievement.name}
                  </motion.div>
                  {achievement.description && (
                    <motion.div 
                      className="achievement-criteria"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                    >
                      {achievement.description}
                    </motion.div>
                  )}
                  <div className="achievement-date">
                    {format(parseISO(achievement.unlockDate), 'MMM do, yyyy')}
                  </div>
                </div>

                <motion.div 
                  className="achievement-type-badge"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  {achievement.type === 'milestone' ? 'Milestone' : 'Badge'}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          <div className="achievement-notifications-footer">
            <p>Tap to dismiss • Auto-dismiss in {autoDismissTime / 1000}s</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementNotification; 