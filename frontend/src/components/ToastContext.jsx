import React, { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext({ toast: () => {} });

/**
 * Small pop up messages, like a phone text message:
 * "Registered successfully", "Request sent successfully", "Donated successfully".
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const toast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, type }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.type}`} role="status">
            <span className="toast-icon">{item.type === "success" ? "✓" : "!"}</span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
