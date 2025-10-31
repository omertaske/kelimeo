const rawBaseUrl = process.env.REACT_APP_API_BASE_URL || 'https://6901e6abb208b24affe42c03.mockapi.io/api';
const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

const apiKey = process.env.REACT_APP_API_KEY || null;
const apiKeyParam = process.env.REACT_APP_API_KEY_PARAM || 'apiKey';

const buildUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  if (!apiKey) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${apiKeyParam}=${apiKey}`;
};

const defaultHeaders = {
  'Content-Type': 'application/json'
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'API isteği başarısız oldu');
  }
  return response.json();
};

export const apiClient = {
  get: async (path) => {
  const response = await fetch(buildUrl(path));
    return handleResponse(response);
  },
  post: async (path, body) => {
  const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  put: async (path, body) => {
  const response = await fetch(buildUrl(path), {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  delete: async (path) => {
  const response = await fetch(buildUrl(path), {
      method: 'DELETE',
      headers: defaultHeaders
    });
    return handleResponse(response);
  }
};

export const API_ENDPOINTS = {
  USERS: '/users',
  GAMES: '/games'
};
