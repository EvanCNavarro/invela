import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpContextType {
  isHelpVisible: boolean;
  showHelp: () => void;
  hideHelp: () => void;
  toggleHelp: () => void;
  currentHelpTopic: string | null;
  setHelpTopic: (topic: string | null) => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

interface HelpProviderProps {
  children: ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [currentHelpTopic, setCurrentHelpTopic] = useState<string | null>(null);

  const showHelp = () => setIsHelpVisible(true);
  const hideHelp = () => setIsHelpVisible(false);
  const toggleHelp = () => setIsHelpVisible(prev => !prev);
  const setHelpTopic = (topic: string | null) => setCurrentHelpTopic(topic);

  return (
    <HelpContext.Provider
      value={{
        isHelpVisible,
        showHelp,
        hideHelp,
        toggleHelp,
        currentHelpTopic,
        setHelpTopic
      }}
    >
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = (): HelpContextType => {
  const context = useContext(HelpContext);
  
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  
  return context;
};

export { HelpContext };