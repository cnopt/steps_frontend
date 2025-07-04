import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const getRarityColors = (rarity) => {
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
  width: 8.5rem;
  height: 8.6rem;
  cursor: pointer;
  perspective: 1000px;
  vertical-align: top;
  margin-right: 0.75rem;
  transform-style: preserve-3d;


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
  
  .pack-text {
    text-align: center;
    margin-top: 35%;
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
