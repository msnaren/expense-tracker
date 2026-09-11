import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light" | "system"
export type MoneyBgTheme = "lockin" | "emerald" | "gold" | "pattern" | "none"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultMoneyBg?: MoneyBgTheme
  storageKey?: string
  bgStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  moneyBg: MoneyBgTheme
  setMoneyBg: (bg: MoneyBgTheme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  moneyBg: "lockin",
  setMoneyBg: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  defaultMoneyBg = "lockin",
  storageKey = "spendwise-theme",
  bgStorageKey = "spendwise-money-bg",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      const saved = localStorage.getItem(storageKey) as Theme;
      return saved === "dark" || saved === "system" ? "light" : (saved || "light");
    }
  )
  const [moneyBg, setMoneyBg] = useState<MoneyBgTheme>(
    () => (localStorage.getItem(bgStorageKey) as MoneyBgTheme) || defaultMoneyBg
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem(storageKey, theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute("data-money-bg", moneyBg)
  }, [moneyBg])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    moneyBg,
    setMoneyBg: (bg: MoneyBgTheme) => {
      localStorage.setItem(bgStorageKey, bg)
      setMoneyBg(bg)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

