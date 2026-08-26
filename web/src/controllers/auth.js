/**
 * Contrôleur Auth — Fonctions d'authentification utilisateur.
 */
import api from '../services/api';

/**
 * Récupère l'utilisateur actuellement connecté depuis le stockage local.
 * @returns {Promise<Object|null>} Objet utilisateur ou null si non connecté.
 */
export async function getCurrentUser() {
  const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
  const user = storage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

/**
 * Connecte un utilisateur avec ses identifiants.
 * @param {Object} params - Paramètres de connexion.
 * @param {string} params.login - Email ou nom d'utilisateur.
 * @param {string} params.password - Mot de passe.
 * @param {boolean} params.rememberMe - Sauvegarder le token dans localStorage.
 * @returns {Promise<Object>} Objet utilisateur connecté.
 * @throws {Error} Si les identifiants sont invalides.
 */
export async function login({ login, password, rememberMe }) {
  const response = await api.post('/auth/user/login', { login, password });

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

/**
 * Inscrit un nouvel utilisateur.
 * @param {Object} data - Données d'inscription (username, email, password).
 * @returns {Promise<Object>} Données du nouvel utilisateur créé.
 */
export const signup = async (data) => {
  const res = await api.post('/auth/user/register', data, {
    withCredentials: true,
  });
  return res.data;
};
