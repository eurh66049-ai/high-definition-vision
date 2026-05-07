import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

type Theme = "dark" | "light";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

type ThemeProviderProps = {
  children: ReactNode;
};

// تطبيق فوري للثيم على <html> (دالة خارجية - لا تسبب re-render)
const applyThemeToDOM = (currentTheme: Theme, persist: boolean) => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  if (currentTheme === 'dark') {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
  if (persist) {
    localStorage.setItem("theme", currentTheme);
    localStorage.setItem("theme-manual", "1");
  }
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const isManualRef = React.useRef<boolean>(
    typeof window !== 'undefined' && localStorage.getItem("theme-manual") === "1"
  );

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const manual = localStorage.getItem("theme-manual") === "1";
      const savedTheme = localStorage.getItem("theme") as Theme | null;
      if (manual && savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // ⚡ تطبيق الثيم على DOM — احفظ في localStorage فقط إذا اختار المستخدم يدوياً
  React.useLayoutEffect(() => {
    applyThemeToDOM(theme, isManualRef.current);
  }, [theme]);

  // مراقبة تغييرات نظام التشغيل — فقط إذا لم يختر المستخدم يدوياً
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!isManualRef.current) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    isManualRef.current = true;
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
