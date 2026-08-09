import React, { createContext, useContext, useState } from 'react';

const MonthContext = createContext(null);

// Compute current month without importing db.js to avoid circular init
const getInitialMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function MonthProvider({ children }) {
  const [month, setMonth] = useState(getInitialMonth());
  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used within MonthProvider');
  return ctx;
}
