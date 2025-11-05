import axios from 'axios';
import toast from 'react-hot-toast'; 
import {  showToastErr } from '../utils/alerts';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;

  const token = storage.getItem('authToken')  ;
  console.log('Token:', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // Ajouter le token dans les headers
  }
  return config;
});

// Intercepteur de réponse : gère toutes les erreurs API au même endroit
api.interceptors.response.use(
  response => response,
  error => {
    console.log(error);
    if (error.response) {
      const errors = error.response.data.errors;
      let field = null;
      let message = 'Une erreur est survenue.';
    
      if (errors?.email) {
        field = 'email';
        message = errors.email;
      } else if (errors?.mdp) {
        field = 'mdp';
        message = errors.mdp;
      } else if (error.response.data.message) {
        message = error.response.data.message;
      }
        
      const err = new Error(message);
      err.field = field;
      throw err;
    } else if (error.request) {
      const msg = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
      showToastErr(msg);
      throw new Error(msg);
    } else {
      const msg = error.message || 'Erreur inconnue.';
      showToastErr(msg);
      throw new Error(msg);
    }
    
  }
);

export default api;
