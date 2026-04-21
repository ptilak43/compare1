const axios = require("axios");

// ENV
const FIREBASE_URL = process.env.FIREBASE_URL;

// LOCATIONS
const locations = [
  { name: "Anklav", lat: 22.56, lon: 72.95 },
  { name: "Nadiad", lat: 22.69, lon: 72.86 }
];

// IST DATE
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

    // 🔹 OPEN-METEO API (NO KEY)
    const apiRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m`
    );

    const apiTempC = apiRes.data.current.temperature_2m;
    const apiHumidity = apiRes.data.current.relative_humidity_2m;
    const apiTempF = +(apiTempC * 1.8 + 32).toFixed(2);

    const keys = Object.keys(data);

    for (let key of keys) {
      const d = data[key];

      // ✅ ONLY TODAY DATA
      if (d.date_ist !== today) continue;

      // ✅ SKIP IF ALREADY EXISTS
      const check = await axios.get(
        `${FIREBASE_URL}/compared/${location.name}/${d.date_ist}/${key}.json`
      );

      if (check.data !== null) continue;

      // ✅ CLEAN DIFFERENCE VALUES
      const diffC = +(d.temp_c - apiTempC).toFixed(2);
      const diffF = +(d.temp_f - apiTempF).toFixed(2);
      const diffH = +(d.humidity - apiHumidity).toFixed(2);

      // 🔥 FINAL FLAT LOG STRUCTURE
      const output = {
        place: location.name,
        date: d.date_ist,
        time: d.time_ist,

        sensor_temp_c: d.temp_c,
        sensor_temp_f: d.temp_f,
        sensor_humidity: d.humidity,

        api_temp_c: apiTempC,
        api_temp_f: apiTempF,
        api_humidity: apiHumidity,

        diff_temp_c: diffC,
        diff_temp_f: diffF,
        diff_humidity: diffH
      };

      // ✅ STORE (GROUPED BY DATE)
      await axios.put(
        `${FIREBASE_URL}/compared/${location.name}/${d.date_ist}/${key}.json`,
        output
      );

      console.log(`✔ ${location.name} saved: ${key}`);
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

// GITHUB ACTIONS MODE
async function main() {
  await run();
  process.exit(0);
}

main();
