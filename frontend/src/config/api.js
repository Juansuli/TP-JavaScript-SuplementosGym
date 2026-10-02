// Same convention as the backend's own dotenv setup (see
// backend/src/config/db.js): read from an environment variable, fall
// back to the local-dev default so nothing extra needs to be set up to
// run the project locally.
const configuredOrigin = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Drop trailing slashes so "https://api.example.com/" does not turn
// into "//api/..." once the services append their own "/api/..." path.
const API_ORIGIN = configuredOrigin.replace(/\/+$/, '')

export { API_ORIGIN }
