import React, { createContext, useContext, useState, useEffect } from "react";
import { usePlaygroundVisibility } from "@/hooks/use-playground-visibility";

interface PlaygroundVisibilityContextType {
  isVisible: boolean;
  toggle: () => void;
  show: () => void;
  hide: () => void;
}

const PlaygroundVisibilityContext = createContext<PlaygroundVisibilityContextType | undefined>(undefined);

interface PlaygroundVisibilityProviderProps {
  children: React.ReactNode;
}

export const PlaygroundVisibilityProvider: React.FC<PlaygroundVisibilityProviderProps> = ({ children }) => {
  // Use the existing Zustand store
  const { isVisible, toggle, show, hide } = usePlaygroundVisibility();

  return (
    <PlaygroundVisibilityContext.Provider value={{ isVisible, toggle, show, hide }}>
      {children}
    </PlaygroundVisibilityContext.Provider>
  );
};

export const usePlaygroundVisibilityContext = (): PlaygroundVisibilityContextType => {
  const context = useContext(PlaygroundVisibilityContext);
  
  if (context === undefined) {
    throw new Error("usePlaygroundVisibilityContext must be used within a PlaygroundVisibilityProvider");
  }
  
  return context;
};

export { PlaygroundVisibilityContext };