import axios from 'axios';

// Live GitHub-hosted complete Indian states & districts JSON
const API_URL = 'https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json';

let cachedLocationData = null;

const fetchLocationData = async () => {
  if (cachedLocationData) return cachedLocationData;
  try {
    const { data } = await axios.get(API_URL);
    // data is { states: [ { state: "State Name", districts: ["...", "..."] } ] }
    cachedLocationData = data.states;
    return cachedLocationData;
  } catch (err) {
    console.error('Error fetching location data from API:', err);
    return [];
  }
};

export const fetchStates = async () => {
  const data = await fetchLocationData();
  return data.map(item => item.state);
};

export const fetchDistricts = async (stateName) => {
  if (!stateName) return [];
  const data = await fetchLocationData();
  const stateObj = data.find(item => item?.state?.toLowerCase() === stateName?.toLowerCase());
  return stateObj ? stateObj.districts : [];
};
