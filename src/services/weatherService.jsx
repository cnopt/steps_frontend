import axios from 'axios';

export class WeatherService {
  async getWeatherForDate(date, latitude, longitude) {
    try {
      return await this.fetchWeatherData(date, latitude, longitude);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  async fetchWeatherData(date, latitude, longitude) {
    const url = `https://archive-api.open-meteo.com/v1/archive`;
    const params = {
      latitude,
      longitude,
      start_date: date.toISOString().split('T')[0],
      end_date: date.toISOString().split('T')[0],
      daily: [
        'weather_code',
        'temperature_2m_max',
        'rain_sum',
        'precipitation_sum',
        'wind_speed_10m_max',
        'sunset'
      ].join(',')
    };

    const { data } = await axios.get(url, { params });

    const getWeatherDescription = (code) => {
      switch (code) {
        case 0:
          return 'clear sky';
        case 1:
          return 'mainly clear';
        case 2:
          return 'partly cloudy';
        case 3:
          return 'overcast';
        case 45:
        case 48:
          return 'foggy';
        case 51:
        case 53:
        case 55:
          return 'drizzle';
        case 61:
        case 63:
        case 65:
          return 'rain';
        case 71:
        case 73:
        case 75:
          return 'snow';
        case 77:
          return 'snow grains';
        case 80:
        case 81:
        case 82:
          return 'rain showers';
        case 85:
        case 86:
          return 'snow showers';
        case 95:
          return 'thunderstorm';
        case 96:
        case 99:
          return 'thunderstorm with hail';
        default:
          return 'unknown';
      }
    };

    return {
      date: date.toISOString().split('T')[0],
      weather_code: getWeatherDescription(data.daily.weather_code[0]),
      temperature_max: Math.round(data.daily.temperature_2m_max[0]),
      rain: data.daily.rain_sum[0],
      precipitation: data.daily.precipitation_sum[0],
      wind_speed_max: data.daily.wind_speed_10m_max[0],
    };
  }
} 