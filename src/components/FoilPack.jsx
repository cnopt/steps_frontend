import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const FoilWrapper = styled(motion.div)`
  position: relative;
  display:inline-block;
  width: 15rem;
  height: 8.6rem;
  cursor: pointer;
  perspective: 1000px;
  vertical-align:top;
  margin-right: 0.75rem;
  transform-style: preserve-3d;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(255,255,255,0.4) 0%,
      rgba(255,255,255,0.1) 50%,
      rgba(255,255,255,0.4) 100%
    );
    border-radius:10px;
    filter: blur(0.5px);
    z-index: 2;
    transform-style: preserve-3d;
  }

  .foil-surface {
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      orange,
      gold,
      orange,
      gold
    );
    background-size: 400% 400%;
    animation: gradient 5s ease infinite;
    border-radius: 10px;
    transform-style: preserve-3d;
  }
  
  .pack-text {
    text-align:center;
    margin-top:20%;
    color:black;
    font-family:sf-mono;
    font-size:2em;
  }

  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes tilt {
    0% { transform: rotateX(0deg) rotateY(0deg); }
    50% { transform: rotateX(0deg) rotateY(180deg); }
    100% { transform: rotateX(0deg) rotateY(0deg); }
  }
`;

const FoilPack = ({ milestone, onUnwrap }) => {
  return (
    <FoilWrapper
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onUnwrap}
    >
      <div className="foil-surface">
        <div className="pack-text">
        󰿆
        </div>
      </div>
    </FoilWrapper>
  );
};

export default FoilPack;
