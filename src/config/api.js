// This file holds the base URL for our backend API.
// It reads from VITE_API_URL on Vercel or defaults to local Django.

const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_BASE_URL = `${backendUrl}/api`;
export const MEDIA_BASE_URL = backendUrl; // For fallback images not hosted on Cloudflare
