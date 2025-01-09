import { useQuery } from '@tanstack/react-query';
import { WeatherService } from '../services/weatherService';

const weatherService = new WeatherService();

const LATITUDE = 50.9603;
const LONGITUDE = -3.1248;

export function useWeatherData(dates) {
  return useQuery({
    queryKey: ['weatherData', dates.map(d => d.toISOString().split('T')[0])],
    queryFn: async () => {
      // Get existing cached data
      const cachedData = localStorage.getItem('weatherData');
      const weatherCache = cachedData ? JSON.parse(cachedData) : {};
      const now = Date.now();
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

      // Filter out dates that are already cached and still valid
      const datesToFetch = dates.filter(date => {
        const dateStr = date.toISOString().split('T')[0];
        const cached = weatherCache[dateStr];
        return !cached || (now - cached.timestamp > ONE_WEEK);
      });

      // Only fetch new dates
      if (datesToFetch.length > 0) {
        for (const date of datesToFetch) {
          const dateStr = date.toISOString().split('T')[0];
          const weather = await weatherService.getWeatherForDate(
            date,
            LATITUDE,
            LONGITUDE
          );
          
          if (weather) {
            weatherCache[dateStr] = {
              ...weather,
              timestamp: now
            };
          }
        }

        // Update localStorage with new data
        localStorage.setItem('weatherData', JSON.stringify(weatherCache));
      }

      // Return all weather data (cached + newly fetched)
      return Object.fromEntries(
        Object.entries(weatherCache).map(([date, data]) => [
          date,
          {
            date: data.date,
            weather_code: data.weather_code,
            temperature_max: data.temperature_max,
            rain: data.rain,
            precipitation: data.precipitation,
            wind_speed_max: data.wind_speed_max,
            sunset: data.sunset
          }
        ])
      );
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    enabled: dates.length > 0
  });
} 