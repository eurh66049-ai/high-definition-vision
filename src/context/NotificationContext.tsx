import React, { createContext, useContext, useState, useCallback } from 'react';

interface NotificationContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  refreshNotifications: () => void;
  shouldRefresh: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const openNotifications = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeNotifications = useCallback(() => {
    setIsOpen(false);
  }, []);

  const refreshNotifications = useCallback(() => {
    setShouldRefresh(prev => !prev);
  }, []);

  const value: NotificationContextType = {
    isOpen,
    setIsOpen,
    openNotifications,
    closeNotifications,
    refreshNotifications,
    shouldRefresh,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};