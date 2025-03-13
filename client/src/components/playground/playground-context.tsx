import { ReactNode, createContext, useContext, useState } from 'react';

interface PlaygroundVisibilityContextType {
  isVisible: boolean;
  setIsVisible: (value: boolean) => void;
}

const defaultContext: PlaygroundVisibilityContextType = {
  isVisible: false,
  setIsVisible: () => {},
};

const PlaygroundVisibilityContext = createContext<PlaygroundVisibilityContextType>(defaultContext);

export function usePlaygroundVisibility() {
  return useContext(PlaygroundVisibilityContext);
}

interface PlaygroundVisibilityProviderProps {
  children: ReactNode;
}

export function PlaygroundVisibilityProvider({ children }: PlaygroundVisibilityProviderProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Only apply the playground styles when the playground is visible
  // This prevents playground styles from affecting other components
  const playgroundClassName = isVisible ? 'playground-active' : '';

  return (
    <PlaygroundVisibilityContext.Provider value={{ isVisible, setIsVisible }}>
      <div className={playgroundClassName}>
        {children}
      </div>
    </PlaygroundVisibilityContext.Provider>
  );
}