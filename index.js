const axios = require("axios");

// ENV
const FIREBASE_URL = process.env.FIREBASE_URL;

// LOCATIONS (lat/lon required)
const locations = [
  { name: "Anklav", lat: 22.56, lon: 72.95 },
  { name: "Nadiad", lat: 22.69, lon: 72.86 }
];

// IST date
function getTodayDateIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split("T")[0];
}

// PROCESS ONE LOCATION
async function processLocation(location) {
  try {
    const today = getTodayDateIST();

    // 🔹 GET FIREBASE DATA
    const res = await axios.get(`${FIREBASE_URL}/${location.name}.json`);
    const data = res.data;

    if (!data) {
      console.log(`No data for ${location.name}`);
      return;
    }

    // 🔹 CALL OPEN-METEO API (NO KEY)
    const apiRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m`
    );

    const apiTempC = apiRes.data.current.temperature_2m;
    const apiHumidity = apiRes.data.current.relative_humidity_2m;
    const apiTempF = apiTempC * 1.8 + 32;

    const keys = Object.keys(data);

    for (let key of keys) {
      const d = data[key];

      // 🔹 ONLY TODAY DATA
      if (d.date_ist !== today) continue;

      // 🔹 CHECK IF ALREADY PROCESSED
      const check = await axios.get(
        `${FIREBASE_URL}/compared/${location.name}/${key}.json`
      );

      if (check.data !== null) continue;

      // 🔹 DIFFERENCE
      const diffC = d.temp_c - apiTempC;
      const diffF = d.temp_f - apiTempF;
      const diffH = d.humidity - apiHumidity;

      // 🔹 OUTPUT
      const output = {
        place: location.name,
        date_ist: d.date_ist,
        time_ist: d.time_ist,

        sensor: {
          temp_c: d.temp_c,
          temp_f: d.temp_f,
          humidity: d.humidity
        },

        api: {
          temp_c: apiTempC,
          temp_f: apiTempF,
          humidity: apiHumidity
        },

        difference: {
          temp_c: diffC,
          temp_f: diffF,
          humidity: diffH
        }
      };

      // 🔹 STORE
      await axios.put(
        `${FIREBASE_URL}/compared/${location.name}/${key}.json`,
        output
      );

      console.log(`✔ ${location.name} processed: ${key}`);
    }

  } catch (err) {
    console.error(`❌ ${location.name} error:`, err.message);
  }
}

// MAIN
async function run() {
  console.log("🚀 Job started");

  for (let loc of locations) {
    await processLocation(loc);
  }

  console.log("✅ Job finished");
}

// GitHub Actions friendly
async function main() {
  await run();
  process.exit(0);
}

main();
