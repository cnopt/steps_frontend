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
    
    // split hours into regular and evening periods
    const regularHours = [10, 11, 12, 13, 14, 15, 16, 17];
    const eveningHours = [18, 19, 20, 21, 22, 23, 24];
    let remainingSteps = totalSteps;
    
    eveningHours.forEach(hour => {
        if (remainingSteps <= 0) return;
        
        const portion = 0.10 + Math.random() * 0.05;   
        const hourlyCount = Math.floor(remainingSteps * portion);
        hourlySteps[hour] = hourlyCount;
        remainingSteps -= hourlyCount;
    });
    
    // regular hours get smaller portions 
    regularHours.forEach(hour => {
        if (remainingSteps <= 0) return;
        
        const portion = 0.05 + Math.random() * 0.08; 
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