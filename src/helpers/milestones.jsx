
export const milestones = [
    { value: 100000, rarity: 'common' },
    { value: 250000, rarity: 'common' },
    { value: 300000, rarity: 'common' },
    { value: 400000, rarity: 'common' },
    { value: 500000, rarity: 'rare' },
    { value: 600000, rarity: 'uncommon' },
    { value: 700000, rarity: 'uncommon' },
    { value: 800000, rarity: 'uncommon' },
    { value: 900000, rarity: 'uncommon' },
    { value: 1000000, rarity: 'rare' },
    { value: 1100000, rarity: 'uncommon' },
    { value: 1200000, rarity: 'uncommon' },
    { value: 1300000, rarity: 'uncommon' },
    { value: 1400000, rarity: 'uncommon' },
    { value: 1500000, rarity: 'rare' },
    { value: 1600000, rarity: 'uncommon' },
    { value: 1700000, rarity: 'uncommon' },
    { value: 1800000, rarity: 'uncommon' },
    { value: 1900000, rarity: 'uncommon' },
    { value: 2000000, rarity: 'rare' },
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