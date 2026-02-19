const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const ratioProgress = (current, target, formatter = (value) => value.toLocaleString()) => {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 1;
  const percent = clamp(safeCurrent / safeTarget);

  return {
    percent,
    label: `${formatter(Math.min(safeCurrent, safeTarget))} / ${formatter(safeTarget)}`
  };
};

const inverseProgress = (bestValue, targetMax) => {
  if (!Number.isFinite(bestValue)) {
    return {
      percent: 0,
      label: `No attempts yet`,
      displayMode: 'metric',
      hasProgress: false,
      labelVariant: 'attempt'
    };
  }

  if (bestValue <= targetMax) {
    return {
      percent: 1,
      label: `${bestValue.toLocaleString()} / ${targetMax.toLocaleString()} (completed)`,
      displayMode: 'metric',
      hasProgress: true
    };
  }

  const overBy = bestValue - targetMax;
  const percent = clamp(1 - (overBy / Math.max(targetMax, 1)));

  return {
    percent,
    label: `Best: ${bestValue.toLocaleString()}`,
    displayMode: 'metric',
    hasProgress: false,
    labelVariant: 'attempt'
  };
};

const binaryThresholdProgress = (bestValue, target, pendingLabel) => {
  const safeBest = Number.isFinite(bestValue) ? bestValue : 0;
  const isCompleted = safeBest >= target;

  return {
    percent: isCompleted ? 1 : 0,
    label: isCompleted ? 'Requirement completed' : pendingLabel,
    isBinary: true,
    hasProgress: isCompleted
  };
};

const metricThresholdProgress = (bestValue, target, formatter = (value) => value.toLocaleString(), labelPrefix = 'Best') => {
  const safeBest = Number.isFinite(bestValue) ? bestValue : 0;
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 1;
  const isCompleted = safeBest >= safeTarget;

  return {
    percent: clamp(safeBest / safeTarget),
    label: `${labelPrefix}: ${formatter(Math.min(safeBest, safeTarget))} / ${formatter(safeTarget)}`,
    displayMode: 'metric',
    hasProgress: isCompleted,
    labelVariant: 'attempt'
  };
};

const exactProgress = (target, countsMap) => {
  const found = countsMap.has(target);
  if (found) {
    return { percent: 1, label: `Hit exactly ${target.toLocaleString()} steps`, isBinary: true, hasProgress: true };
  }

  const values = [...countsMap];
  if (values.length === 0) {
    return { percent: 0, label: 'No step logs yet', isBinary: true, hasProgress: false, labelVariant: 'attempt' };
  }

  const closest = values.reduce((best, current) => {
    const bestDiff = Math.abs(best - target);
    const currentDiff = Math.abs(current - target);
    return currentDiff < bestDiff ? current : best;
  }, values[0]);

  const diff = Math.abs(closest - target);
  const percent = clamp(1 - (diff / Math.max(target, 1)));

  return {
    percent,
    label: `Closest: ${closest.toLocaleString()} (${diff.toLocaleString()} away)`,
    isBinary: true,
    hasProgress: false,
    labelVariant: 'attempt'
  };
};

const getDateKey = (dateValue) => new Date(dateValue).toISOString().split('T')[0];

export const DEFAULT_EMBLEM_BADGE_IDS = new Set([42, 43, 44]);

export const calculateAchievementProgress = (stepsData, weatherData, weatherEnabled) => {
  const progressMap = {};
  if (!Array.isArray(stepsData) || stepsData.length === 0) {
    return progressMap;
  }

  const sortedSteps = [...stepsData].sort(
    (a, b) => new Date(a.formatted_date) - new Date(b.formatted_date)
  );

  const totalSteps = sortedSteps.reduce((sum, day) => sum + day.steps, 0);
  const maxDailySteps = sortedSteps.reduce((max, day) => Math.max(max, day.steps), 0);
  const stepValues = new Set(sortedSteps.map(day => day.steps));

  let bestEightKStreak = 0;
  let currentEightKStreak = 0;
  let bestSubOneKStreak = 0;
  let currentSubOneKStreak = 0;
  let bestIncreasingStreak = sortedSteps.length > 0 ? 1 : 0;
  let currentIncreasingStreak = sortedSteps.length > 0 ? 1 : 0;
  let hasMatchingConsecutiveDays = false;

  for (let i = 0; i < sortedSteps.length; i++) {
    const day = sortedSteps[i];

    if (day.steps >= 8000) {
      currentEightKStreak += 1;
    } else {
      currentEightKStreak = 0;
    }
    bestEightKStreak = Math.max(bestEightKStreak, currentEightKStreak);

    if (day.steps < 1000) {
      currentSubOneKStreak += 1;
    } else {
      currentSubOneKStreak = 0;
    }
    bestSubOneKStreak = Math.max(bestSubOneKStreak, currentSubOneKStreak);

    if (i > 0) {
      if (day.steps > sortedSteps[i - 1].steps) {
        currentIncreasingStreak += 1;
      } else {
        currentIncreasingStreak = 1;
      }

      if (day.steps === sortedSteps[i - 1].steps) {
        hasMatchingConsecutiveDays = true;
      }
    }
    bestIncreasingStreak = Math.max(bestIncreasingStreak, currentIncreasingStreak);
  }

  const weekendTotals = [];
  let currentWeekendSteps = 0;
  let inWeekendBlock = false;
  let weekendTotalSteps = 0;

  for (const day of sortedSteps) {
    const dayOfWeek = new Date(day.formatted_date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      weekendTotalSteps += day.steps;
      currentWeekendSteps += day.steps;
      inWeekendBlock = true;
    } else if (inWeekendBlock) {
      weekendTotals.push(currentWeekendSteps);
      currentWeekendSteps = 0;
      inWeekendBlock = false;
    }
  }

  if (inWeekendBlock) {
    weekendTotals.push(currentWeekendSteps);
  }

  const maxWeekendSteps = weekendTotals.length ? Math.max(...weekendTotals) : 0;
  const minWeekendSteps = weekendTotals.length ? Math.min(...weekendTotals) : Number.POSITIVE_INFINITY;

  const seasons = new Set();
  for (const day of sortedSteps) {
    const month = new Date(day.formatted_date).getMonth();
    if (month >= 2 && month <= 4) seasons.add('spring');
    else if (month >= 5 && month <= 7) seasons.add('summer');
    else if (month >= 8 && month <= 10) seasons.add('fall');
    else seasons.add('winter');
  }

  const monthlyTotalsByKey = sortedSteps.reduce((acc, day) => {
    const date = new Date(day.formatted_date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    acc[key] = (acc[key] || 0) + day.steps;
    return acc;
  }, {});

  const monthlyTotals = Object.entries(monthlyTotalsByKey)
    .map(([key, steps]) => {
      const [year, month] = key.split('-').map(Number);
      return { year, month, steps };
    })
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));

  const maxMonthSteps = monthlyTotals.length ? Math.max(...monthlyTotals.map(month => month.steps)) : 0;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const currentMonthSteps = monthlyTotalsByKey[currentMonthKey] || 0;

  let bestMonthlyIncreasingStreak = monthlyTotals.length > 0 ? 1 : 0;
  let currentMonthlyIncreasingStreak = monthlyTotals.length > 0 ? 1 : 0;
  for (let i = 1; i < monthlyTotals.length; i++) {
    if (monthlyTotals[i].steps > monthlyTotals[i - 1].steps) {
      currentMonthlyIncreasingStreak += 1;
    } else {
      currentMonthlyIncreasingStreak = 1;
    }
    bestMonthlyIncreasingStreak = Math.max(bestMonthlyIncreasingStreak, currentMonthlyIncreasingStreak);
  }

  const strideLengthMeters = (170 * 0.42) / 100;
  const distanceMeters = totalSteps * strideLengthMeters;

  let rainyTotalSteps = 0;
  let maxRainyDaySteps = 0;
  let maxColdDaySteps = 0;
  let minFreezingDaySteps = Number.POSITIVE_INFINITY;
  let maxSnowDaySteps = 0;
  let maxHotDaySteps = 0;
  let coldTotalSteps = 0;
  let april20Max = Number.NEGATIVE_INFINITY;
  let june20Max = Number.NEGATIVE_INFINITY;

  for (const day of sortedSteps) {
    const date = new Date(day.formatted_date);
    const dateKey = getDateKey(day.formatted_date);
    const weather = weatherEnabled ? weatherData[dateKey] : null;

    if (date.getMonth() === 3 && date.getDate() === 20) {
      april20Max = Math.max(april20Max, day.steps);
    }

    if (date.getMonth() === 5 && date.getDate() === 20) {
      june20Max = Math.max(june20Max, day.steps);
    }

    if (!weather) {
      continue;
    }

    if (weather.rain > 0 && weather.weather_code === 'rain') {
      rainyTotalSteps += day.steps;
      maxRainyDaySteps = Math.max(maxRainyDaySteps, day.steps);
    }

    if (weather.temperature_max <= 3) {
      coldTotalSteps += day.steps;
    }

    if (weather.temperature_max <= 1) {
      maxColdDaySteps = Math.max(maxColdDaySteps, day.steps);
      minFreezingDaySteps = Math.min(minFreezingDaySteps, day.steps);
    }

    if (weather.weather_code === 'snow') {
      maxSnowDaySteps = Math.max(maxSnowDaySteps, day.steps);
    }

    if (weather.temperature_max >= 28) {
      maxHotDaySteps = Math.max(maxHotDaySteps, day.steps);
    }
  }

  progressMap[1] = ratioProgress(totalSteps, 500000);
  progressMap[2] = metricThresholdProgress(maxDailySteps, 25000, value => value.toLocaleString(), 'Closest');
  progressMap[3] = metricThresholdProgress(bestEightKStreak, 7, value => `${value} days`, 'Best streak');
  progressMap[4] = ratioProgress(maxWeekendSteps, 20000);
  progressMap[5] = ratioProgress(totalSteps, 1000000);
  progressMap[6] = ratioProgress(seasons.size, 4, value => `${value} seasons`);
  progressMap[7] = ratioProgress(currentMonthSteps, 300000);
  progressMap[8] = ratioProgress(rainyTotalSteps, 100000);
  progressMap[9] = ratioProgress(maxRainyDaySteps, 20000);
  progressMap[10] = ratioProgress(weekendTotalSteps, 500000);
  progressMap[11] = binaryThresholdProgress(
    april20Max,
    4200,
    Number.isFinite(april20Max) ? `Best April 20: ${april20Max.toLocaleString()} / 4,200` : ''
  );
  progressMap[12] = inverseProgress(minWeekendSteps, 5000);
  progressMap[13] = binaryThresholdProgress(
    june20Max,
    10000,
    Number.isFinite(june20Max) ? `Best June 20: ${june20Max.toLocaleString()} / 10,000` : ''
  );
  progressMap[14] = exactProgress(1337, stepValues);
  progressMap[15] = exactProgress(1111, stepValues);
  progressMap[16] = exactProgress(9999, stepValues);
  progressMap[17] = {
    percent: hasMatchingConsecutiveDays ? 1 : 0,
    label: hasMatchingConsecutiveDays ? 'Found matching consecutive days' : '',
    isBinary: true
  };
  progressMap[18] = metricThresholdProgress(bestSubOneKStreak, 7, value => `${value} days`, 'Best streak');
  progressMap[19] = ratioProgress(maxColdDaySteps, 7000);
  progressMap[20] = metricThresholdProgress(bestIncreasingStreak, 5, value => `${value} days`, 'Best streak');
  progressMap[21] = ratioProgress(maxHotDaySteps, 10000);
  progressMap[22] = ratioProgress(distanceMeters, 21100, value => `${Math.floor(value).toLocaleString()}m`);
  progressMap[23] = ratioProgress(distanceMeters, 42200, value => `${Math.floor(value).toLocaleString()}m`);
  progressMap[24] = ratioProgress(distanceMeters, 160934, value => `${(value / 1609.34).toFixed(0)} mi`);
  progressMap[25] = ratioProgress(distanceMeters, 321869, value => `${(value / 1609.34).toFixed(0)} mi`);
  progressMap[26] = metricThresholdProgress(maxWeekendSteps, 50000, value => value.toLocaleString(), 'Best weekend');
  progressMap[27] = exactProgress(2222, stepValues);
  progressMap[28] = exactProgress(3333, stepValues);
  progressMap[29] = exactProgress(4444, stepValues);
  progressMap[30] = exactProgress(5555, stepValues);
  progressMap[31] = ratioProgress(rainyTotalSteps, 500000);
  progressMap[32] = ratioProgress(maxSnowDaySteps, 8000);
  progressMap[33] = ratioProgress(bestMonthlyIncreasingStreak, 3, value => `${value} months`);
  progressMap[34] = ratioProgress(bestMonthlyIncreasingStreak, 6, value => `${value} months`);
  progressMap[35] = exactProgress(6666, stepValues);
  progressMap[36] = exactProgress(7777, stepValues);
  progressMap[37] = exactProgress(8888, stepValues);
  progressMap[38] = ratioProgress(coldTotalSteps, 100000);
  progressMap[39] = ratioProgress(coldTotalSteps, 500000);
  progressMap[40] = ratioProgress(distanceMeters, 804670, value => `${(value / 1609.34).toFixed(0)} mi`);
  progressMap[41] = inverseProgress(minFreezingDaySteps, 2000);

  return progressMap;
};
