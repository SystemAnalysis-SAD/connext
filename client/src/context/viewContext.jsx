import { createContext, useContext, useState } from "react";

const ViewContext = createContext();

export const useViewContext = () => useContext(ViewContext);

export const ViewContextProvider = ({ children }) => {
  const [view, setView] = useState("messages");
  const [messageView, setMessageView] = useState("users");

  return (
    <ViewContext.Provider
      value={{ view, setView, messageView, setMessageView }}
    >
      {children}
    </ViewContext.Provider>
  );
};
