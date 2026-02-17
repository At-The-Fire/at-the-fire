import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Auth from '../../../components/Auth/Auth';
import Gallery from '../../../components/Gallery/Gallery';
// import { AccountProvider } from '../../../context/AccountContext';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoadingProvider } from '../../../context/LoadingContext.js';
import { QueryProvider } from '../../../context/QueryContext.js';

const mockTheme = {
  palette: {
    secondary: {
      light: '#fff',
    },
  },
  typography: {
    body2: {
      fontSize: 16,
    },
  },
};
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ profile: {}, bizProfile: {}, posts: [] }),
    ok: true,
  })
);
describe('Auth component', () => {
  test.skip('renders email input', () => {
    render(
      <LoadingProvider>
        {/* <AccountProvider> */}
        <MemoryRouter initialEntries={['/auth/sign-in']}>
          <Routes>
            <Route path="/auth/:type" element={<Auth />} />
          </Routes>
        </MemoryRouter>
        {/* </AccountProvider> */}
      </LoadingProvider>,
      { theme: mockTheme }
    );
    const emailInput = screen.getByText('Email');
    expect(emailInput).toBeInTheDocument();
  });

  test.skip('renders password input', () => {
    render(
      <LoadingProvider>
        {/* <AccountProvider> */}
        <MemoryRouter initialEntries={['/auth/sign-in']}>
          <Routes>
            <Route path="/auth/:type" element={<Auth />} />
          </Routes>
        </MemoryRouter>
        {/* </AccountProvider> */}
      </LoadingProvider>,
      { theme: mockTheme }
    );
    const passwordInput = screen.getByText('Password');
    expect(passwordInput).toBeInTheDocument();
  });

  test.skip('renders confirm password input when sign-up', () => {
    render(
      <LoadingProvider>
        {/* <AccountProvider> */}
        <MemoryRouter initialEntries={['/auth/sign-up']}>
          <Routes>
            <Route path="/auth/:type" element={<Auth />} />
          </Routes>
        </MemoryRouter>
        {/* </AccountProvider> */}
      </LoadingProvider>,
      { theme: mockTheme }
    );
    const confirmPasswordInput = screen.getByText('Confirm Password');
    expect(confirmPasswordInput).toBeInTheDocument();
  });

  test.skip('shows error message when passwords do not match', async () => {
    render(
      <LoadingProvider>
        {/* <AccountProvider> */}
        <MemoryRouter initialEntries={['/auth/sign-up']}>
          <Routes>
            <Route path="/auth/:type" element={<Auth />} />
          </Routes>
        </MemoryRouter>
        {/* </AccountProvider> */}
      </LoadingProvider>,
      { theme: mockTheme }
    );
    const passwordInput = screen.getByTestId('password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(passwordInput, {
      target: { defaultValue: 'password' },
    });

    fireEvent.change(confirmPasswordInput, {
      target: { defaultValue: 'wrong' },
    });

    const handleSubmitPasswords = fireEvent.submit(submitButton);

    expect(handleSubmitPasswords).toBe(false);
  });

  test.skip('shows error message when authentication fails', async () => {
    const fetchAuth = jest.fn(() => false);
    render(
      <LoadingProvider>
        {/* <AccountProvider value={{ fetchAuth }}> */}
        <MemoryRouter initialEntries={['/auth/sign-in']}>
          <Routes>
            <Route path="/auth/:type" element={<Auth />} />
          </Routes>
        </MemoryRouter>
        {/* </AccountProvider> */}
      </LoadingProvider>,
      { theme: mockTheme }
    );
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    const handleSubmitButton = fireEvent.submit(submitButton);

    expect(handleSubmitButton).toBe(false);
  });

  test.skip('redirects to home page when authenticated', async () => {
    const fetchAuth = jest.fn(() => true);
    const isAuthenticated = true; // set isAuthenticated to true using the AccountContext
    render(
      <LoadingProvider>
        {/* <AccountProvider value={{ fetchAuth, isAuthenticated }}> */}
        <QueryProvider>
          <MemoryRouter initialEntries={['/auth/sign-in', '/']}>
            <Routes>
              <Route path="/auth/:type" element={<Auth />} />
              <Route path="/" element={<Gallery />} />
            </Routes>
          </MemoryRouter>
        </QueryProvider>
        {/* </AccountProvider> */}
      </LoadingProvider>,
      { theme: mockTheme }
    );

    // await waitFor(() => {
    //   expect(screen.getByText('Stuff.')).toBeInTheDocument();
    // });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
});
