/**
 * Dataset Generator for AgriConnect
 * DIDT3110 - Part D: Artificial Intelligence
 * Generates 1,200 realistic agricultural transaction & market records for Lesotho
 */

const fs = require('fs');
const path = require('path');

const districts = [
  { name: 'Maseru', transport: 60, urbanWeight: 1.3, rainfallFactor: 1.0 },
  { name: 'Berea', transport: 90, urbanWeight: 1.1, rainfallFactor: 1.05 },
  { name: 'Leribe', transport: 120, urbanWeight: 1.15, rainfallFactor: 1.1 },
  { name: 'Mafeteng', transport: 110, urbanWeight: 0.95, rainfallFactor: 0.9 },
  { name: 'Mohale\'s Hoek', transport: 160, urbanWeight: 0.85, rainfallFactor: 0.92 },
  { name: 'Quthing', transport: 220, urbanWeight: 0.8, rainfallFactor: 0.95 },
  { name: 'Qacha\'s Nek', transport: 320, urbanWeight: 0.75, rainfallFactor: 1.15 },
  { name: 'Mokhotlong', transport: 340, urbanWeight: 0.7, rainfallFactor: 1.2 },
  { name: 'Thaba-Tseka', transport: 280, urbanWeight: 0.72, rainfallFactor: 1.1 },
  { name: 'Butha-Buthe', transport: 170, urbanWeight: 0.9, rainfallFactor: 1.12 }
];

const crops = [
  { name: 'Maize', category: 'grains', basePrice: 6.50, baseYieldPerHa: 2.4, peakSeason: 'Autumn', waterNeeds: 85 },
  { name: 'Sorghum', category: 'grains', basePrice: 7.20, baseYieldPerHa: 1.8, peakSeason: 'Autumn', waterNeeds: 55 },
  { name: 'Wheat', category: 'grains', basePrice: 9.80, baseYieldPerHa: 2.1, peakSeason: 'Spring', waterNeeds: 65 },
  { name: 'Beans (Dry)', category: 'legumes', basePrice: 22.50, baseYieldPerHa: 1.1, peakSeason: 'Autumn', waterNeeds: 70 },
  { name: 'Potatoes', category: 'vegetables', basePrice: 8.80, baseYieldPerHa: 14.0, peakSeason: 'Summer', waterNeeds: 90 },
  { name: 'Tomatoes', category: 'vegetables', basePrice: 12.50, baseYieldPerHa: 18.0, peakSeason: 'Summer', waterNeeds: 110 },
  { name: 'Cabbage', category: 'vegetables', basePrice: 7.00, baseYieldPerHa: 16.0, peakSeason: 'Winter', waterNeeds: 75 },
  { name: 'Peaches', category: 'fruits', basePrice: 19.00, baseYieldPerHa: 6.5, peakSeason: 'Summer', waterNeeds: 80 }
];

const seasons = ['Summer', 'Autumn', 'Winter', 'Spring'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function randomGaussian(mean, stdev) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdev;
}

const records = [];
const startDate = new Date(2023, 0, 15);

for (let i = 1; i <= 1200; i++) {
  const dateObj = new Date(startDate.getTime() + Math.random() * (3 * 365 * 24 * 60 * 60 * 1000));
  const monthIdx = dateObj.getMonth();
  const monthName = months[monthIdx];

  let season = 'Summer';
  if ([2, 3, 4].includes(monthIdx)) season = 'Autumn';
  else if ([5, 6, 7].includes(monthIdx)) season = 'Winter';
  else if ([8, 9, 10].includes(monthIdx)) season = 'Spring';

  const dist = districts[Math.floor(Math.random() * districts.length)];
  const crop = crops[Math.floor(Math.random() * crops.length)];

  const farmSizeHa = parseFloat((0.5 + Math.random() * 12).toFixed(2));
  
  // Seasonal weather
  let baseRain = season === 'Summer' ? 110 : season === 'Spring' ? 70 : season === 'Autumn' ? 45 : 18;
  const rainfallMm = Math.max(5, parseFloat((randomGaussian(baseRain * dist.rainfallFactor, 15)).toFixed(1)));
  
  let baseTemp = season === 'Summer' ? 24 : season === 'Spring' ? 19 : season === 'Autumn' ? 16 : 8;
  const tempC = parseFloat((randomGaussian(baseTemp, 3)).toFixed(1));

  const soilPh = parseFloat((5.4 + Math.random() * 2.1).toFixed(2));
  const fertilizerKgHa = Math.round(Math.max(20, randomGaussian(140, 45)));

  // Yield calculation based on inputs + realistic agronomic behavior
  const waterSatisfaction = Math.min(1.3, rainfallMm / crop.waterNeeds);
  const fertilizerEffect = 0.7 + (fertilizerKgHa / 220) * 0.45;
  const phEffect = soilPh >= 6.0 && soilPh <= 7.0 ? 1.1 : 0.9;
  const yieldPerHa = parseFloat((crop.baseYieldPerHa * waterSatisfaction * fertilizerEffect * phEffect * randomGaussian(1.0, 0.08)).toFixed(2));
  const totalYieldTons = parseFloat(Math.max(0.2, yieldPerHa * farmSizeHa).toFixed(2));

  // Market demand index (0 - 100)
  const isPeakHarvest = crop.peakSeason === season;
  let demandIndex = Math.round(Math.min(98, Math.max(15, randomGaussian(55 * dist.urbanWeight + (isPeakHarvest ? 10 : -5), 12))));

  // Competitor supply: higher in peak harvest season
  const competitorSupplyTons = Math.round(Math.max(10, randomGaussian(isPeakHarvest ? 180 : 75, 25)));

  // Transport cost to major terminal market (Maseru central market)
  const transportCostLsl = Math.round(dist.transport * (1 + Math.random() * 0.25));

  // Realized market price:
  // - Base crop price
  // - High competitor supply depresses price
  // - High demand increases price
  // - Transport cost adds premium
  // - Off-season scarcity drives up price
  const supplyPressure = (140 - competitorSupplyTons) / 140; // positive if supply low
  const demandPressure = (demandIndex - 50) / 100;
  const offSeasonBonus = isPeakHarvest ? -0.08 : 0.14;
  const priceMultiplier = 1 + (demandPressure * 0.35) + (supplyPressure * 0.25) + offSeasonBonus;
  
  const actualPricePerKg = parseFloat(Math.max(crop.basePrice * 0.55, crop.basePrice * priceMultiplier + (transportCostLsl * 0.005) + randomGaussian(0, 0.4)).toFixed(2));

  // Sales volume (kg)
  const availableKg = totalYieldTons * 1000;
  const salesFraction = Math.min(1.0, Math.max(0.4, (demandIndex / 100) * 0.8 + 0.35));
  const salesVolumeKg = Math.round(availableKg * salesFraction);

  // Total sales revenue
  const totalRevenueLsl = Math.round(salesVolumeKg * actualPricePerKg - (transportCostLsl * (salesVolumeKg / 1000)));

  // Days to sell inventory (Sales velocity)
  const daysToSell = Math.round(Math.max(1, 28 - (demandIndex * 0.24) + (actualPricePerKg / crop.basePrice) * 5 + randomGaussian(0, 2)));

  // Demand Tier
  const demandTier = demandIndex >= 65 ? 'High' : demandIndex >= 40 ? 'Medium' : 'Low';

  records.push({
    record_id: `AGC-${String(i).padStart(5, '0')}`,
    date: dateObj.toISOString().split('T')[0],
    month: monthName,
    season,
    district: dist.name,
    crop_name: crop.name,
    category: crop.category,
    farm_size_ha: farmSizeHa,
    rainfall_mm: rainfallMm,
    temperature_c: tempC,
    soil_ph: soilPh,
    fertilizer_kg_per_ha: fertilizerKgHa,
    historical_avg_price_lsl: crop.basePrice,
    competitor_supply_tons: competitorSupplyTons,
    market_demand_index: demandIndex,
    transport_cost_lsl: transportCostLsl,
    yield_tons: totalYieldTons,
    actual_price_per_kg_lsl: actualPricePerKg,
    sales_volume_kg: salesVolumeKg,
    revenue_lsl: totalRevenueLsl,
    days_to_sell: daysToSell,
    demand_tier: demandTier
  });
}

// Convert to CSV
const headers = Object.keys(records[0]).join(',');
const rows = records.map(r => Object.values(r).join(',')).join('\n');
const csvContent = `${headers}\n${rows}`;

const targetPath = path.join(__dirname, '..', 'data', 'lesotho_crop_market_dataset.csv');
fs.writeFileSync(targetPath, csvContent, 'utf8');

console.log(`✅ Generated ${records.length} records to ${targetPath}`);

