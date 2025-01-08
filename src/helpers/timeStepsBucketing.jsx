// create empty 24-hour buckets
const createEmptyHourBuckets = () => {
    const buckets = {};
    for (let i = 0; i < 25; i++) {
        buckets[i] = 0;
    }
    return buckets;
};

// Convert regular steps data to have hour buckets
export const convertToHourlyBuckets = (stepsData) => {
    const hourlyData = {};

    stepsData.forEach(dayData => {
        hourlyData[dayData.formatted_date] = {
            ...dayData,
            hourlyBreakdown: createEmptyHourBuckets(),
            simulatedHourlySteps: simulateHourlyDistribution(dayData.steps)
        };
    });

    return hourlyData;
};

// simulate hourly distribution
const simulateHourlyDistribution = (totalSteps) => {
    const hourlySteps = createEmptyHourBuckets();
    
    // realistic distribution (only steps during awake hours)
    const activeHours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    let remainingSteps = totalSteps;
    
    // distribute last steps randomly
    activeHours.forEach(hour => {
        if (remainingSteps <= 0) return;
        
        const portion = Math.random() * 0.1; // 10% of leftover steps
        const hourlyCount = Math.floor(remainingSteps * portion);
        hourlySteps[hour] = hourlyCount;
        remainingSteps -= hourlyCount;
    });
    
    
    return hourlySteps;
};

export const getHourlySteps = (hourlyData, date, hour) => {
    if (!hourlyData[date] || !hourlyData[date].simulatedHourlySteps) return 0;
    return hourlyData[date].simulatedHourlySteps[hour] || 0;
}; 