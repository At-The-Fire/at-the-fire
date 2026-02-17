import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore.js';

function StripeReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loadingAuth, customerId, loadingCustomerId, authenticateUser } =
    useAuthStore();

  const returnFromStripe = searchParams.get('return_from_stripe') === 'true';

  useEffect(() => {
    if (!isAuthenticated && returnFromStripe) {
      authenticateUser();
    }
  }, [returnFromStripe]);

  useEffect(() => {
    if (!loadingAuth) {
      if (isAuthenticated && customerId && !loadingCustomerId) {
        navigate('/dashboard');
      } else if (!returnFromStripe) {
        navigate('/auth/sign-in');
      }
    }
  }, [loadingAuth, navigate, isAuthenticated, customerId, loadingCustomerId, returnFromStripe]);

  return null;
}

export default StripeReturn;
