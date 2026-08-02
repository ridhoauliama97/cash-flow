import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ComponentProps, ReactNode } from "react"

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider> & { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  )
}

export { useTheme }
