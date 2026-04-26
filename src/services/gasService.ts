/// <reference types="vite/client" />
export const GAS_URL = (import.meta.env.NEXT_PUBLIC_GAS_WEB_APP_URL || import.meta.env.VITE_GAS_WEB_APP_URL) as string;

export async function callGas(payload: any) {
  if (!GAS_URL || !GAS_URL.startsWith('https://script.google.com')) {
    throw new Error('Please provide a valid Google Apps Script Web App URL (must start with https://script.google.com)');
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const text = await response.text();
    
    // Check if the response is actually an HTML login page due to wrong GAS deployment permissions
    if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.includes('<html')) {
      throw new Error('Google Apps Script returned an HTML page. Ensure it is deployed with "Execute as: Me" and "Who has access: Anyone".');
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON response from server.');
    }
    
    if (!result.success) {
      if (result.error === 'unauthorized') {
        gasAuth.logout();
        window.dispatchEvent(new Event('gas-unauthorized'));
      }
      throw new Error(result.error || 'Unknown error');
    }

    return result.data;
  } catch (error) {
    console.error('GAS Request Failed:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Could not reach the server (CORS error or network failure). Check the URL.');
    }
    throw error;
  }
}

// In-memory token storage (as per requirements)
let sessionToken: string | null = null;
let currentUserId: string | null = null;
let currentFullName: string | null = null;
let currentTowns: string[] = [];
let activeTown: string | null = null;

export const gasAuth = {
  login: async (username: string, password: string) => {
    // The instruction specifies username is the full name, we map it to "email" for the payload
    const data = await callGas({ action: 'login', email: username, password });
    sessionToken = data.token;
    currentUserId = data.userId;
    currentFullName = data.fullName;
    currentTowns = data.towns || [];
    activeTown = currentTowns.length > 0 ? currentTowns[0] : null;
    return data;
  },
  register: async (username: string, password: string, town: string) => {
    const data = await callGas({ action: 'register', email: username, password, town });
    sessionToken = data.token;
    currentUserId = data.userId;
    currentFullName = data.fullName;
    currentTowns = data.towns || [];
    activeTown = currentTowns.length > 0 ? currentTowns[0] : null;
    return data;
  },
  logout: () => {
    sessionToken = null;
    currentUserId = null;
    currentFullName = null;
    currentTowns = [];
    activeTown = null;
  },
  getToken: () => sessionToken,
  getUserId: () => currentUserId,
  getFullName: () => currentFullName || 'Member',
  getTowns: () => currentTowns,
  getActiveTown: () => activeTown,
  setActiveTown: (town: string) => { activeTown = town; },
  isAuthenticated: () => sessionToken !== null,
};

export async function fetchFromGas(action: string, payload: any = {}) {
  const token = gasAuth.getToken();
  if (!token) {
    throw new Error('unauthorized');
  }

  return await callGas({
    action,
    token,
    town: activeTown,
    ...payload,
  });
}
