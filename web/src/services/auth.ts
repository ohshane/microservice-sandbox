import { API_URL } from "@/config";

export async function register(payload: { email: string; password: string }) {
  return await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  return await getMe();
}

export async function logout() {
  return await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
}

export async function refresh() {
  return await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
}

export async function getMe() {
  return await fetch(`${API_URL}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
}

export async function updateMe(payload: {
  username?: string;
  name?: string;
  bio?: string;
  is_active?: boolean;
}) {
  return await fetch(`${API_URL}/api/v1/auth/me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  old_password: string;
  new_password: string;
}) {
  return await fetch(`${API_URL}/api/v1/auth/me/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
}
