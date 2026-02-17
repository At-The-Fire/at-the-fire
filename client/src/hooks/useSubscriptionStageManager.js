import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/useAuthStore.js';

export function useSubscriptionStageManager() {
  const { result } = useParams();
  const getInitialStage = () => {
    if (result === 'success' || result === 'cancel' || result === 'dashboard') {
      return 2;
    }
    return 0;
  };

  const [stage, setStage] = useState(getInitialStage());

  useEffect(() => {
    const storedState = localStorage.getItem('subscriptionStage');
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        setStage(parsedState);
      } catch (e) {
        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error parsing stored state:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error parsing stored state: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useSubscriptionStageManager-1',
            autoClose: false,
          });
        }
      }
    }
  }, []);

  // Save to localStorage when stage changes
  useEffect(() => {
    localStorage.setItem('subscriptionStage', JSON.stringify(stage));
  }, [stage]);

  // Handle URL result parameter
  useEffect(() => {
    switch (result) {
      case 'success':
        setStage(2);
        break;
      case 'cancel':
        setStage(2);
        break;
      case 'dashboard':
        setStage(2);
        break;
      default:
        setStage(0);
        break;
    }
  }, [result]);

  return { stage, setStage };
}
