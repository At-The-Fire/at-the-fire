import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { LoadingProvider } from './context/LoadingContext.js';
import { QueryProvider } from './context/QueryContext.js';
import { ProfileProvider } from './context/ProfileContext.js';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  document.title = 'At The Fire: LOCAL';
}
root.render(
  <React.StrictMode>
    <LoadingProvider>
      <QueryProvider>
        <ProfileProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ProfileProvider>
      </QueryProvider>
    </LoadingProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
