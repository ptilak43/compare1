const axios = require("axios");

// ENV VARIABLES
const FIREBASE_URL = process.env.FIREBASE_URL;
const API_KEY = process.env.API_KEY;

// LOCATIONS
const locations = [
  { name: "Anklav", city: "Anand" },
  { name: "Nadiad", city: "Nadiad" }
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

    const res = await axios.get(`${FIREBASE_URL}/${location.name}.json`);
    const data = res.data;

    if (!data) {
      console.log(`No data for ${location.name}`);
      return;
    }

    // API CALL (once)
    const apiRes = await axios.get(
      `http://api.openweathermap.org/data/2.5/weather?q=${location.city}&appid=${API_KEY}&units=metric`
    );

    const apiTempC = apiRes.data.main.temp;
    const apiHumidity = apiRes.data.main.humidity;
    const apiTempF = apiTempC * 1.8 + 32;

    const keys = Object.keys(data);

    for (let key of keys) {
      const d = data[key];

      // only today's data
      if (d.date_ist !== today) continue;

      // check duplicate
      const check = await axios.get(
        `${FIREBASE_URL}/compared/${location.name}/${key}.json`
      );

      if (check.data !== null) continue;

      // difference
      const diffC = d.temp_c - apiTempC;
      const diffF = d.temp_f - apiTempF;
      const diffH = d.humidity - apiHumidity;

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

// RUN ONCE (GitHub Actions style)
async function main() {
  await run();
  process.exit(0);
}

main();
