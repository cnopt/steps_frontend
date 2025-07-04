export const calculateDistance = (steps) => {
  // get height directly
  const heightCm = parseInt(localStorage.getItem('userHeight')) || 170;
  const strideLength = heightCm * 0.413;
  
  const distanceCm = steps * strideLength;
  const distanceKm = distanceCm / 100000;
  const distanceMiles = distanceKm * 0.621371;
  
  return Math.round(distanceMiles * 10) / 10;
}; 


export const calculateCalories = (steps) => {
  // get settings from localStorage
  const heightCm = parseInt(localStorage.getItem('userHeight')) || 170;
  const weightKg = parseInt(localStorage.getItem('userWeight')) || 70;
  const gender = localStorage.getItem('userGender') || 'M';
  const age = 28;

  const distanceKm = (steps * (heightCm * 0.413)) / 100000;
  const met = 3.8;

  const bmr = gender === 'M'
    ? 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age)
    : 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);

  const activeMinutes = steps / 100;
  const caloriesBurned = (met * bmr * activeMinutes) / (24 * 60);

  return Math.round(caloriesBurned);
}; 