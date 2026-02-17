import { createContext, useState, useContext } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loginLoading, setLoginLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [loadingGalleryResults, setLoadingGalleryResults] = useState(false);

  return (
    <LoadingContext.Provider
      value={{
        loginLoading,
        setLoginLoading,
        pageLoading,
        setPageLoading,
        loadingGalleryResults,
        setLoadingGalleryResults,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

const useLoadingState = () => {
  const context = useContext(LoadingContext);

  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }

  return context;
};

export default useLoadingState;
