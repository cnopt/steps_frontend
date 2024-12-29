import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const getRarityColors = (rarity) => {
  console.log(rarity)
  switch (rarity) {
    case 'common':
      return {
        colors: ['#c0c0c0', '#ffffff', '#c0c0c0', '#e6e6e6'],
        shimmer: 'rgba(255,255,255,0.3)'
      };
    case 'uncommon':
      return {
        colors: ['orange', 'gold', 'orange', 'gold'],
        shimmer: 'rgba(255,255,255,0.4)'
      };
    case 'rare':
      return {
        colors: ['darkviolet', 'blueviolet', 'darkviolet', 'blueviolet'],
        shimmer: 'rgba(255,255,255,0.4)'
      };
    default:
      return {
        colors: ['#c0c0c0', 'green', '#c0c0c0', '#e6e6e6'],
        shimmer: 'rgba(255,255,255,0.3)'
      };
  }
};

const FoilWrapper = styled(motion.div)`
  position: relative;
  display: inline-block;
  width: 15rem;
  height: 8.6rem;
  cursor: pointer;
  perspective: 1000px;
  vertical-align: top;
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
      ${props => props.$shimmerColor} 0%,
      rgba(255,255,255,0.1) 50%,
      ${props => props.$shimmerColor} 100%
    );
    border-radius: 8px;
    filter: blur(0.5px);
    z-index: 2;
    transform-style: preserve-3d;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 0.5rem;
    height: 60%;
    background: linear-gradient(
      90deg,
      rgba(0,0,0,0.3),
      rgba(0,0,0,0.1) 50%,
      rgba(0,0,0,0) 100%
    );
    transform: translateY(-50%);
    border-radius: 2px;
    z-index: 3;
  }

  .foil-surface {
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      ${props => props.$colors[0]},
      ${props => props.$colors[1]},
      ${props => props.$colors[2]},
      ${props => props.$colors[3]}
    );
    background-size: 400% 400%;
    animation: gradient 5s ease infinite;
    border-radius: 8px;
    transform-style: preserve-3d;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      right: 0;
      width: 0.5rem;
      height: 60%;
      background: linear-gradient(
        -90deg,
        rgba(0,0,0,0.3),
        rgba(0,0,0,0.1) 50%,
        rgba(0,0,0,0) 100%
      );
      transform: translateY(-50%);
      border-radius: 2px;
      z-index: 3;
    }
  }
  
  .pack-text {
    text-align: center;
    margin-top: 20%;
    color: black;
    font-family: sf-mono;
    font-size: 2em;
  }

  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const FoilPack = ({ milestone, onUnwrap }) => {
  console.log(milestone.rarity)
  const { colors, shimmer } = getRarityColors(milestone.rarity);

  return (
    <FoilWrapper
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onUnwrap}
      $colors={colors}
      $shimmerColor={shimmer}
    >
      <div className="foil-surface">
        <div className="pack-text">
        
        </div>
      </div>
    </FoilWrapper>
  );
};

export default FoilPack;
