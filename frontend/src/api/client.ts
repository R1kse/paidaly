import axios from 'axios';
import { API_URL } from '../config';
import { useToastStore } from '../store/toast';

const ERROR_MESSAGES: Record<string, string> = {
  OUT_OF_DELIVERY_ZONE: 'Адрес вне зоны 4 км',
  MIN_ORDER_NOT_MET: 'Минимальная сумма заказа 5000 ?',
  OUT_OF_WORKING_HOURS: 'Мы работаем с 09:00 до 18:00',
  PREORDER_NOT_READY: 'Слишком рано для предзаказа',
  PREORDER_NOT_ALLOWED: 'Предзаказ недоступен',
  INVALID_MODIFIERS: 'Некорректные модификаторы',
  FORBIDDEN_STATUS_CHANGE: 'Недоступное действие',
};

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const code = data?.code as string | undefined;
    const message = data?.message as string | undefined;
    const mapped = code ? ERROR_MESSAGES[code] : undefined;

    if (mapped || message) {
      useToastStore.getState().show(mapped ?? message ?? 'Ошибка запроса', 'error');
    } else if (!error?.response) {
      useToastStore.getState().show('Сервер недоступен', 'error');
    }

    return Promise.reject(error);
  },
);