import { createContext, useContext, useState } from "react";

const ViewContext = createContext();

export const useViewContext = () => useContext(ViewContext);

export const ViewContextProvider = ({ children }) => {
  const [view, setView] = useState("users");

  return (
    <ViewContext.Provider value={{ view, setView }}>
      {children}
    </ViewContext.Provider>
  );
};
