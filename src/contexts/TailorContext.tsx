import { createContext, useContext } from "react";
import type { ReactNode } from "react";

interface TailorContextType {
  isTailorMode: boolean;
  isSuperAdmin: boolean;
  toggleTailorMode: () => void;
  saveEdit: (key: string, value: string) => Promise<void>;
  getOverride: (key: string) => string | null;
}

const TailorContext = createContext<TailorContextType>({
  isTailorMode: false,
  isSuperAdmin: false,
  toggleTailorMode: () => {},
  saveEdit: async () => {},
  getOverride: () => null,
});

export function useTailor() {
  return useContext(TailorContext);
}

export function TailorProvider({ children }: { children: ReactNode }) {
  return (
    <TailorContext.Provider value={{
      isTailorMode: false,
      isSuperAdmin: false,
      toggleTailorMode: () => {},
      saveEdit: async () => {},
      getOverride: () => null,
    }}>
      {children}
    </TailorContext.Provider>
  );
}
