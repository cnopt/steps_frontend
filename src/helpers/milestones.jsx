
export const milestones = [
    { value: 100000, rarity: 'common', titleImage: '/titles/green.jpg', titleImageSize: '200%', titleImagePos: '62% 66%' },
    { value: 250000, rarity: 'common', titleImage: '/titles/green.jpg', titleImageSize: '200%', titleImagePos: '62% 66%' },
    { value: 300000, rarity: 'common', titleImage: '/titles/green.jpg', titleImageSize: '200%', titleImagePos: '62% 66%' },
    { value: 400000, rarity: 'common', titleImage: '/titles/green.jpg', titleImageSize: '200%', titleImagePos: '62% 66%' },
    { value: 500000, rarity: 'rare', titleImage: '/titles/sharp-blue.jpg', titleImageSize: '115%', titleImagePos: '30% 45%' },
    { value: 600000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 700000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 800000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 900000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1000000, rarity: 'rare', titleImage: '/titles/sharp-blue.jpg', titleImageSize: '115%', titleImagePos: '30% 45%' },
    { value: 1100000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1200000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1300000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1400000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1500000, rarity: 'rare', titleImage: '/titles/sharp-blue.jpg', titleImageSize: '115%', titleImagePos: '30% 45%' },
    { value: 1600000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1700000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1800000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 1900000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 2000000, rarity: 'rare', titleImage: '/titles/sharp-blue.jpg', titleImageSize: '115%', titleImagePos: '30% 45%' },
    { value: 2100000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 2200000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 2300000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 2400000, rarity: 'uncommon', titleImage: '/titles/vf-kids.jpg', titleImageSize: '158%', titleImagePos: '-5% 79%' },
    { value: 2500000, rarity: 'rare', titleImage: '/titles/sharp-blue.jpg', titleImageSize: '115%', titleImagePos: '30% 45%' },
    { value: 3000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 3500000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 4000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 4500000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 5000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 5500000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 6000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 6500000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 7000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 7500000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 8000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 8500000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 9000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 9500000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
    { value: 10000000, rarity: 'rare', titleImage: '/titles/blue-yellow-blocks.jpg', titleImageSize: '100%', titleImagePos: '0% 45%' },
];


export const calculateMilestoneDays = ({allSteps}) => {
  // Sort steps by date (earliest first)
  const sortedSteps = [...allSteps].sort(
    (a, b) => new Date(a.formatted_date) - new Date(b.formatted_date)
  );

  const milestoneDays = new Map();
  let runningTotal = 0;
  let currentMilestoneIndex = 0;

  // Process each day's steps sequentially
  for (const dayData of sortedSteps) {
    runningTotal += dayData.steps;

    // Check if we've crossed the current milestone
    if (currentMilestoneIndex < milestones.length && 
        runningTotal >= milestones[currentMilestoneIndex].value) {
      milestoneDays.set(
        dayData.formatted_date,
        milestones[currentMilestoneIndex]
      );
      currentMilestoneIndex++; // Move to next milestone
    }

    // Exit if we've found all milestones
    if (currentMilestoneIndex >= milestones.length) {
      break;
    }
  }

  return milestoneDays;
};