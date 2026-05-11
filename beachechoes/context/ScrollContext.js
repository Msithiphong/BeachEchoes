import { createContext } from 'react'

// Screens consume this to coordinate shared top/bottom navigation animations.
export const ScrollContext = createContext({
  scrollHandler: () => {},
  navbarHeight: 0,
})
