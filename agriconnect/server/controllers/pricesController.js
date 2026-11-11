const { Price } = require('../models');
const axios = require('axios');

/**
 * GET /api/prices
 * Query parameters: crop_name, category, market, limit
 */
const getPrices = async (req, res) => {
  try {
    const { crop_name, category, market, limit = 50 } = req.query;
    const where = {};

    if (crop_name) where.crop_name = crop_name;
    if (category) where.category = category;
    if (market) where.market = market;

    const prices = await Price.findAll({
      where,
      limit: parseInt(limit, 10),
      order: [['recorded_date', 'DESC']],
    });

    return res.json({ prices });
  } catch (err) {
    console.error('getPrices error:', err);
    return res.status(500).json({ error: 'Failed to fetch prices.' });
  }
};

/**
 * POST /api/prices (advisor or admin)
 */
const addPrice = async (req, res) => {
  try {
    const { crop_name, category, min_price, max_price, avg_price, unit, market, recorded_date } = req.body;

    if (!crop_name || !avg_price) {
      return res.status(400).json({ error: 'Crop name and average price are required.' });
    }

    const price = await Price.create({
      crop_name,
      category,
      min_price,
      max_price,
      avg_price,
      unit: unit || 'kg',
      market: market || 'Maseru Central Market',
      recorded_date: recorded_date || new Date(),
    });

    return res.status(201).json({ message: 'Price record created.', price });
  } catch (err) {
    console.error('addPrice error:', err);
    return res.status(500).json({ error: 'Failed to record price.' });
  }
};

// District geographical coordinates for all 10 districts in Lesotho
const DISTRICT_COORDINATES = {
  'Maseru': { lat: -29.3167, lon: 27.4833 },
  'Leribe': { lat: -28.8719, lon: 28.0450 },
  'Berea': { lat: -29.1833, lon: 27.7500 },
  'Mafeteng': { lat: -29.8230, lon: 27.2374 },
  "Mohale's Hoek": { lat: -30.1514, lon: 27.4769 },
  "Qacha's Nek": { lat: -30.1154, lon: 28.6894 },
  'Mokhotlong': { lat: -29.2894, lon: 29.0675 },
  'Quthing': { lat: -30.4000, lon: 27.7000 },
  'Thaba-Tseka': { lat: -29.5220, lon: 28.6084 },
  'Butha-Buthe': { lat: -28.7667, lon: 28.2500 },
};

// Map WMO weather interpretation codes to readable text descriptions
const WMO_CODE_MAP = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * GET /api/prices/weather/:district
 * Live meteorological data via Open-Meteo API (with OpenWeatherMap fallback)
 */
const getWeather = async (req, res) => {
  const district = req.params.district || 'Maseru';

  try {
    const coords = DISTRICT_COORDINATES[district] || DISTRICT_COORDINATES['Maseru'];

    // 1. Primary Live API: Open-Meteo (No API key required, highly accurate ECMWF/GFS global models)
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa/Johannesburg`;

    const response = await axios.get(openMeteoUrl, { timeout: 8000 });
    const current = response.data?.current;
    const daily = response.data?.daily;

    if (current) {
      const code = current.weather_code || 0;
      const description = WMO_CODE_MAP[code] || 'Clear sky';

      // Agronomic advisory calculation based on real meteorological variables
      let alert = null;
      if (current.temperature_2m <= 2) {
        alert = 'Low temperature alert: Sub-zero ground frost vulnerability. Mitigate frost risks for vulnerable crops.';
      } else if (current.precipitation > 5 || (daily && daily.precipitation_sum && daily.precipitation_sum[0] > 10)) {
        alert = 'Significant precipitation recorded: Delay field drying and chemical spraying activities.';
      } else if (current.wind_speed_10m > 10) {
        alert = 'High sustained wind velocity (>10 m/s): Exercise caution during aerial or boom herbicide application.';
      } else if (current.temperature_2m >= 28) {
        alert = 'Elevated daytime temperatures: Monitor soil moisture and transpiration stress in non-irrigated plots.';
      } else {
        alert = 'Favorable meteorological window for field operations, weeding, and mechanical harvest.';
      }

      return res.json({
        weather: {
          district,
          temperature: current.temperature_2m,
          feelsLike: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          description,
          windSpeed: current.wind_speed_10m,
          precipitation: current.precipitation,
          maxTemp: daily?.temperature_2m_max?.[0] || current.temperature_2m,
          minTemp: daily?.temperature_2m_min?.[0] || current.temperature_2m,
          alert,
        },
        source: 'open-meteo-live',
      });
    }

    // 2. Secondary Fallback: OpenWeatherMap (if configured in environment)
    const apiKey = process.env.WEATHER_API_KEY;
    if (apiKey && apiKey !== 'your_openweathermap_api_key') {
      const owmRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`,
        { timeout: 5000 }
      );
      const data = owmRes.data;
      return res.json({
        weather: {
          district,
          temperature: data.main.temp,
          feelsLike: data.main.feels_like,
          humidity: data.main.humidity,
          description: data.weather[0].description,
          windSpeed: data.wind.speed,
          precipitation: 0,
          maxTemp: data.main.temp_max,
          minTemp: data.main.temp_min,
          alert: 'Conditions nominal for regional farming tasks.',
        },
        source: 'openweathermap-live',
      });
    }

    return res.json({
      weather: getMockWeather(district),
      source: 'offline-fallback',
    });
  } catch (err) {
    console.error(`Live weather query failed for ${district}:`, err.message);
    return res.json({
      weather: getMockWeather(district),
      source: 'offline-fallback',
      error: err.message,
    });
  }
};

const getMockWeather = (district) => ({
  district: district || 'Maseru',
  temperature: 18.2,
  feelsLike: 17.5,
  humidity: 58,
  description: 'Partly cloudy',
  windSpeed: 3.4,
  precipitation: 0,
  maxTemp: 22.0,
  minTemp: 12.0,
  alert: 'Favorable conditions for routine agricultural activities.',
});

module.exports = { getPrices, addPrice, getWeather };
