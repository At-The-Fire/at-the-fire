import { create } from 'zustand';
import { createCookies, deleteCookies } from '../services/cookieAPI';
import { toast } from 'react-toastify';
import { AmazonCognitoIdentity, userPool } from '../services/userPool.js';
import usePostStore from './usePostStore.js';

const BASE_URL = process.env.REACT_APP_BASE_URL;

export const useAuthStore = create((set, get) => ({
  // State
  accessToken: null,
  admin: false,
  cookiesSet: false,
  customerId: null,
  email: '',
  error: null,
  isAuthenticated: false,
  isTokenValid: true,
  loadingAuth: false,
  loadingCustomerId: false,
  loginLoading: false,
  stripeEmail: '',
  stripeName: '',
  tokenExpiryTime: null,
  user: null,
  signingOut: false,
  isRefreshing: false,
  isConfirmed: false,
  trialStatus: false,
  challengeName: null,
  challengeUser: null,
  challengeParams: null,

  // Actions
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsConfirmed: (isConfirmed) => set({ isConfirmed }),
  setAdmin: (admin) => set({ admin }),
  setCustomerId: (customerId) => set({ customerId }),
  setEmail: (email) => set({ email }),
  setError: (error) => set({ error }),
  setPassword: (password) => set({ password }),
  setCPassword: (cPassword) => set({ cPassword }),
  setLoadingAuth: (loadingAuth) => set({ loadingAuth }),
  setLoadingCustomerId: (customerId) => set({ customerId }),
  setLoginLoading: (loading) => set({ loginLoading: loading }),
  setTrialStatus: (trialStatus) => set({ trialStatus }),

  // -- Auth related actions

  // Dedicated auth error handler
  handleAuthError: (statusCode, message = '') => {
    console.log('ERROR');
    console.log('statusCode', statusCode);
    console.log('message', message);

    if (statusCode === 401) {
      // Unauthorized - sign them out
      set({
        error: statusCode,
        errorDetails: { code: statusCode, message },
        isRequestBlocked: true,
      });
      get().handleSignOut();
    } else if (statusCode === 403) {
      // Forbidden - just block requests and show error
      set({
        error: statusCode,
        errorDetails: { code: statusCode, message },
        isRequestBlocked: true,
      });
    }
  },

  fetchAuth: async ({ email, password, type, navigate }) => {
    if (type === 'sign-up') {
      try {
        const result = await new Promise((resolve, reject) => {
          const attributeList = [
            new AmazonCognitoIdentity.CognitoUserAttribute({
              Name: 'email',
              Value: email,
            }),
          ];

          userPool.signUp(email, password, attributeList, null, (e, result) => {
            if (e) {
              reject(e);
            } else {
              resolve(result);
            }
          });
        });

        const BASE_URL = process.env.REACT_APP_BASE_URL;
        const resp = await fetch(`${BASE_URL}/api/v1/auth/new-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, sub: result.userSub }),
        });
        const data = await resp.json();
        if (resp.ok) {
          localStorage.setItem('needsVerification', 'true');
          navigate('/auth/sign-in');
          return data;
        } else {
          throw data;
        }
      } catch (e) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(e);
        }
        !toast.error(`Account error: ${e}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'auth-error-1',
          autoClose: false,
        });
        throw e;
      }
    } else if (type === 'sign-in') {
      try {
        return await new Promise((resolve, reject) => {
          const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: email,
            Password: password,
          });

          const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool,
          });

          cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: async (result) => {
              try {
                set({ user: cognitoUser.username });
                await createCookies(result);
                set({ error: null, isAuthenticated: true });

                resolve(result);
              } catch (e) {
                reject(new Error('[SYSTEM] Failed during onSuccess: ' + e.message));
              }
            },
            onFailure: (e) => {
              set({ error: e.message });
              if (e.code === 'UserNotFoundException' || e.code === 'NotAuthorizedException') {
                reject(new Error('Incorrect email or password'));
              } else if (e.code === 'UserNotConfirmedException') {
                reject(new Error('Email not confirmed'));
              } else {
                reject(new Error('[SYSTEM] ' + e.message));
              }
            },
            newPasswordRequired: (userAttributes, requiredAttributes) => {
              // This triggers the redirect to password change page
              set({
                challengeName: 'NEW_PASSWORD_REQUIRED',
                challengeUser: cognitoUser,
                challengeParams: { userAttributes, requiredAttributes },
              });
              resolve({ challengeName: 'NEW_PASSWORD_REQUIRED' });
            },
          });
        });
      } catch (e) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(e);
        }
        throw e;
      }
    }
  },

  handleSignOut: async () => {
    if (get().signingOut) {
      return;
    }

    set({ signingOut: true });
    const { email } = get();

    try {
      const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool,
      });

      // Bundle all sign-out operations into a single atomic operation
      await Promise.all([
        deleteCookies(),
        new Promise((resolve) => {
          cognitoUser.signOut();
          cognitoUser.getSession((err, session) => {
            if (err || !session.isValid()) resolve();
          });
        }),
      ]);

      // Only after ALL operations complete, reset state
      set({
        error: null,
        user: null,
        isAuthenticated: false,
        signingOut: false,
        customerId: null,
        cookiesSet: false,
        errorDetails: null,
        isTokenValid: false,
        email: '',
        password: '',
        admin: false,
        trialStatus: false,
      });

      usePostStore.getState().reset();
      get().clearSelectiveStorage();
    } catch (e) {
      set({ signingOut: false });
      toast.error(`Error signing out and deleting cookies: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'auth-error-1',
        autoClose: false,
      });
    }
  },

  clearSelectiveStorage: () => {
    const patternsToRemove = ['CognitoIdentityServiceProvider', 'dashboardTab', 'subscriptionStage', 'auth-storage'];

    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (patternsToRemove.some((pattern) => key.includes(pattern))) {
        localStorage.removeItem(key);
      }
    });
  },

  handleForgotPassword: ({ code, stage, setStage, email, password, setPassword, cPassword, setCPassword }) => {
    const getUser = () => {
      return new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool,
      });
    };

    const sendVerificationCode = () => {
      getUser().forgotPassword({
        onSuccess: (result) => {
          // eslint-disable-next-line no-console
          console.info('on success', result);
        },
        onFailure: (e) => {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error(e);
          }
          toast.error(`Error sending verification code: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useAuth-5',
            autoClose: false,
          });
        },

        inputVerificationCode: (data) => {
          // eslint-disable-next-line no-console
          console.info(data);
          setStage(1);
        },
      });
    };

    const resetPassword = () => {
      if (password !== cPassword) {
        set({ error: 'Passwords do not match' });
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Passwords do not match');
        }
        return;
      }
      getUser().confirmPassword(code, password, {
        onSuccess: (data) => {
          // eslint-disable-next-line no-console
          console.info('New password confirmed:', data);
          toast.success('Password changed successfully', {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useAuth-7',
            autoClose: false,
          });
          setStage(2);
          setPassword('');
          setCPassword('');
        },
        onFailure: (e) => {
          set({ error: e.message });
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('onFailure:', e.message);
          }
          toast.error(`Error resetting and confirming password: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useAuth-6',
            autoClose: false,
          });
        },
      });
    };

    stage === 0 && sendVerificationCode();
    stage === 1 && resetPassword();
  },

  handleRegistration: async (e, type, password, cPassword, navigate) => {
    e.preventDefault();

    set({ loadingAuth: true });

    try {
      if (type === 'sign-up' && password !== cPassword) {
        throw new Error('Passwords do not match');
      }

      const { email } = get();
      const result = await get().fetchAuth({ email, password, type, navigate });

      if (result) {
        // If we're in the NEW_PASSWORD_REQUIRED flow, don't call checkStripeCustomer
        if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
          // Handle the challenge state appropriately (e.g., redirect to password change form)
          // and exit early.
          return true;
        } else {
          // Only proceed with the Stripe customer check if the user is fully authenticated
          const customerData = type === 'sign-in' ? await get().checkStripeCustomer() : null;
          set({
            isAuthenticated: true,
            isConfirmed: customerData?.data?.confirmed,
            admin: customerData?.data?.admin,
            customerId: customerData?.data?.customerId || null,
            error: null,
            password: '',
            cPassword: '',
            trialStatus: customerData?.data?.subscription?.status,
          });
          return true;
        }
      } else {
        set({ isAuthenticated: false });
        return false;
      }
    } catch (e) {
      set({
        isAuthenticated: false,
        error: { message: e.message },
      });

      if (
        e.message?.startsWith('Passwords') ||
        e.message?.startsWith('Incorrect') ||
        e.message?.startsWith('A') ||
        e.message?.startsWith('User') ||
        e.message?.startsWith('Email')
      ) {
        toast.warn(e.message, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'user-error',
          autoClose: 5000,
        });
      } else if (e.message?.startsWith('[SYSTEM]')) {
        toast.error(`An unexpected error occurred: ${e.message.replace('[SYSTEM] ', '')}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'auth-error-2',
          autoClose: false,
        });
      }
    } finally {
      set({ loadingAuth: false });
    }
  },

  verifyAuth: async (type) => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/stripe/verify`, {
        credentials: 'include',
      });

      if (!response.ok) {
        get().handleSignOut();
        return false;
      } else if (type === 'tabs') {
        return true;
      }

      // If verification succeeded, let authenticateUser handle setting all the state
      return await get().authenticateUser();
    } catch (error) {
      get().handleSignOut();
      return false;
    }
  },

  authenticateUser: async () => {
    if (get().signingOut) {
      return;
    }

    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      return;
    }

    try {
      const session = await new Promise((resolve, reject) => {
        cognitoUser.getSession((err, session) => (err ? reject(err) : resolve(session)));
      });

      if (!session || !session.isValid()) {
        cognitoUser.signOut();
        set({
          accessToken: '',
          isAuthenticated: false,
        });
        return;
      }
      if (session.isValid()) {
        const customerData = await get().checkStripeCustomer();

        set({
          accessToken: session.accessToken.jwtToken,
          admin: customerData?.data?.admin,
          user: cognitoUser.getUsername(),
          email: session.getIdToken().payload.email,
          tokenExpiryTime: session.getIdToken().getExpiration(),
          isAuthenticated: true,
          customerId: customerData?.data?.customerId || null,
          isConfirmed: customerData?.data?.confirmed || null,
        });
      } else {
        set({
          accessToken: '',
          isAuthenticated: false,
        });
      }
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed authentication', error);
      }
      set({
        error: 'Failed authentication',
        isAuthenticated: false,
      });

      if (error.message.startsWith('Token')) {
        toast.warn(error.message, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'auth-error-2',
          autoClose: false,
        });
      } else {
        toast.error(`Failed authentication: ${error.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'auth-error-3',
          autoClose: false,
        });
      }
    }
  },

  refreshTokens: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh-tokens`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh tokens');
      }

      const data = await response.json();
      set({
        tokenExpiryTime: data.accessTokenExpiry,
        isTokenValid: true,
      });
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error refreshing tokens:', error);
      }
      set({ isTokenValid: false });
      get().handleSignOut();
    }
  },

  checkTokenExpiry: async () => {
    const { tokenExpiryTime, isRefreshing, isAuthenticated } = get();

    // Only check if we're authenticated and not already refreshing
    if (!isAuthenticated || isRefreshing) return;

    if (tokenExpiryTime) {
      const timeUntilExpiry = tokenExpiryTime - Date.now() / 1000;

      // Refresh if less than 5 minutes until expiry
      if (timeUntilExpiry < 300) {
        set({ isRefreshing: true });
        try {
          await get().refreshTokens();
        } catch (error) {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Token refresh failed:', error);
          }
          get().handleSignOut();
        } finally {
          set({ isRefreshing: false });
        }
      }
    }
  },

  handlePasswordChangeSuccess: async (result, navigate) => {
    try {
      const { challengeUser, challengeParams } = get();

      // Get the sub from user attributes
      const userAttributes = await new Promise((resolve, reject) => {
        challengeUser.getUserAttributes((err, attributes) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(attributes);
        });
      });

      const sub = userAttributes.find((attr) => attr.getName() === 'sub')?.getValue();

      // Create the user in database
      const resp = await fetch(`${BASE_URL}/api/v1/auth/new-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: challengeParams.userAttributes.email,
          sub: sub,
        }),
      });

      if (!resp.ok) {
        throw await resp.json();
      }

      // Clean up challenge state and redirect
      set({
        error: null,
        challengeName: null,
        challengeUser: null,
        challengeParams: null,
        isAuthenticated: false,
      });

      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }

      navigate('/auth/sign-in');
    } catch (e) {
      // Clean up challenge state here too
      set({
        error: e.message,
        challengeName: null,
        challengeUser: null,
        challengeParams: null,
      });
      throw new Error('Failed during password change: ' + e.message);
    }
  },

  // -- Stripe related actions

  checkStripeCustomer: async () => {
    let result = { status: 200, data: null, error: null };

    try {
      const url = `${BASE_URL}/api/v1/auth/check-customer`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (resp.status === 401 || resp.status === 403) {
        get().handleAuthError(resp.status);
        return null;
      }

      result.status = resp.status;

      if (!resp.ok) {
        const errorData = await resp.json();
        let error = {
          code: resp.status,
          message: errorData.message || `Error: Status ${resp.status}`,
          type: errorData.type || 'CustomerCheckError',
        };

        if (resp.status === 404) {
          error.message = 'No profile found';
          error.type = 'ProfileNotFound';
        }

        throw error;
      } else {
        result.data = await resp.json();
      }
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed authentication', e);
      }
      throw e;
    }

    return result;
  },

  fetchStripeCustomerDetails: async () => {
    const { isAuthenticated, user } = get(); // Now we get state from same store

    if (!isAuthenticated || !user) return;

    set({ loadingCustomerId: true });
    try {
      const stripeCustomer = await get().checkStripeCustomer();

      set({
        stripeName: stripeCustomer.data.name,
        stripeEmail: stripeCustomer.data.email,
        customerId: stripeCustomer.data?.customerId || null, // Now setting in same store
      });
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching Stripe customer details:', error);
      }
      set({ customerId: null });
      toast.error(`Error checking for customer details: ${error.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useAuth-4',
        autoClose: false,
      });
    } finally {
      set({ loadingCustomerId: false });
    }
  },
}));
