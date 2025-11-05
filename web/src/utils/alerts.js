import Swal from 'sweetalert2';
import { colors } from '../theme';
import {store} from '../redux/store';

const getIsDarkMode = () => store.getState().theme.mode === 'dark';

export const showAlert = (title, text, icon = 'info') => {
  const isDarkMode = getIsDarkMode();

  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'OK',
    background: isDarkMode ? '#1f1f1f' : '#fff',
    color: isDarkMode ? '#fff' : '#000',
  });
};

export const showConfirm = async (
  title,
  icon = 'warning',
  confirmButtonText = 'Oui, supprimer',
  text,
  cancelButtonText = 'Annuler',
) => {
  const isDarkMode = getIsDarkMode();

  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    customClass: {
      confirmButton: `px-4 m-4 py-2 rounded-lg text-white bg-red-500`,
      cancelButton: `px-4 m-4 py-2 rounded-lg text-white bg-gray-500`,
    },
    buttonsStyling: false,
    background: isDarkMode ? '#1f1f1f' : '#fff',
    color: isDarkMode ? '#fff' : '#000',
  });

  return result.isConfirmed;
};

export const showConfirmInf = async (
  title,
  icon = 'info',
  confirmButtonText = 'Terminé',
  text,
) => {
  const isDarkMode = getIsDarkMode();

  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: false,
    confirmButtonText,
    customClass: {
      confirmButton: `px-4 m-4 py-2 rounded-lg text-white bg-emerald-500`,
    },
    buttonsStyling: false,
    background: isDarkMode ? '#1f1f1f' : '#fff',
    color: isDarkMode ? '#fff' : '#000',
  });

  return result.isConfirmed;
};

export const showToast = (message, icon = 'success') => {
  const isDarkMode = getIsDarkMode();

  return Swal.fire({
    toast: true,
    position: 'bottom-left',
    icon,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: isDarkMode ? '#1f1f1f' : '#fff',
    color: isDarkMode ? '#fff' : '#000',
  });
};

export const showToastErr = (message, icon = 'error') => {
  const isDarkMode = getIsDarkMode();

  return Swal.fire({
    toast: true,
    position: 'bottom-left',
    icon,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: isDarkMode ? '#1f1f1f' : '#fff',
    color: isDarkMode ? '#fff' : '#000',
  });
};

export const showError = (message = 'Une erreur est survenue.', title = 'Erreur') => {
  const isDarkMode = getIsDarkMode();

  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonText: 'Fermer',
    background: isDarkMode ? '#1f1f1f' : '#fff',
    color: isDarkMode ? '#fff' : '#000',
  });
};
