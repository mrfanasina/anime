import api from '../services/api';

export async function getCurrentUser() {
  const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
  const user = storage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

export async function login({ login, password, rememberMe }) {
  const response = await api.post('/auth/user/login', {
    login,
    password,
  });

  if (response.status !== 200) {
    const error = new Error(response.data.message || 'Erreur lors de la connexion');
    if (response.data.field) {
      error.field = response.data.field;
    }
    throw error;
  }

  const { token, user } = response.data;
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('authToken', token);
  storage.setItem('currentUser', JSON.stringify(user));

  return user;
}

export const signup = async (data) => {
  const res = await api.post('/auth/user/register', data, {
    withCredentials: true,
  });
  return res.data;
};
