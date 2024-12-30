import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import { badges } from '../helpers/badges';
import { format, parseISO } from 'date-fns';

const Badges = ({ unlockedBadges }) => {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const lockedBadgeImage = '../src/assets/badges/locked.png';

  const [{ rotateY }, api] = useSpring(() => ({
    rotateY: 0,
    config: { mass: 1, tension: 150, friction: 26 }
  }));

  const bindDrag = useDrag(({ movement: [mx], down }) => {
    api.start({
      rotateY: down ? mx : 0,
      immediate: down
    });
  }, {
    pointer: { touch: true }
  });

  const handleBadgeClick = (badge, unlockedInfo) => {
    if (unlockedInfo) {
      setSelectedBadge({ ...badge, unlockDate: unlockedInfo.unlockDate });
    }
  };

  return (
    <>
      <motion.div 
        className='badge-container'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {badges.map((badge, index) => {
          const unlockedInfo = unlockedBadges.find(b => b.id === badge.id);
          const isUnlocked = !!unlockedInfo;
          
          return (
            <motion.div 
              key={badge.id}
              className={`badge-item ${isUnlocked ? 'unlocked' : 'locked'}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                delay: index * 0.1,
                duration: 0.2,
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              onClick={() => handleBadgeClick(badge, unlockedInfo)}
              style={{ cursor: isUnlocked ? 'pointer' : 'default' }}
            >
              <motion.div 
                className='badge-img'
                whileHover={isUnlocked ? { scale: 1.1 } : { scale: 1.0 }}
              >
                <img src={isUnlocked ? badge.image : lockedBadgeImage} alt={badge.name} />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {selectedBadge && (
          <>
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBadge(null)}
            />
            <div className='modal-container'>
              <motion.div
                className="modal-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <animated.div
                  {...bindDrag()}
                  style={{
                    transform: rotateY.to(r => `perspective(1000px) rotateY(${r}deg)`),
                    cursor: 'grab',
                    touchAction: 'none'
                  }}
                >
                  <img 
                    src={selectedBadge.image} 
                    alt={selectedBadge.name}
                    className="modal-badge-image"
                    draggable="false"
                  />
                </animated.div>
                <p className="modal-badge-description">{selectedBadge.description}</p>
                <p className="modal-badge-date">
                    Unlocked on:<br/>{format(parseISO(selectedBadge.unlockDate), 'do MMMM yyyy')}
                </p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Badges;