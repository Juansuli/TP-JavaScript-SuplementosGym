// Same convention as the backend's own dotenv setup (see
// backend/src/config/db.js): read from an environment variable, fall
// back to the local-dev default so nothing extra needs to be set up to
// run the project locally.
const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export { API_ORIGIN }
