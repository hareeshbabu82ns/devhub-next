"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "../ui/button"

export default function ThemeModeToggle() {
  const { theme, setTheme } = useTheme()
  const [ mounted, setMounted ] = useState( false )

  // Only render UI after mounted to avoid hydration issues
  useEffect( () => {
    setMounted( true )
  }, [] )

  if ( !mounted ) {
    return null
  }

  // Toggle between light, dark, and system
  const toggleTheme = () => {
    if ( theme === 'dark' ) {
      setTheme( 'light' )
    } else if ( theme === 'light' ) {
      setTheme( 'system' )
    } else {
      setTheme( 'dark' )
    }
  }

  return (
    <Button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-muted transition-colors"
      aria-label="Toggle theme"
      variant="outline"
      size="icon"
    >
      {theme === 'dark' ? (
        <MoonIcon className="h-5 w-5" />
      ) : theme === 'light' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MonitorIcon className="h-5 w-5" />
      )}
    </Button>
  )
}