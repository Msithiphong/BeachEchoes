import { createContext } from 'react'

export const ScrollContext = createContext({
  scrollHandler: () => {},
  navbarHeight: 0,
})
