"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface HeaderAnimationState {
  scrolled: boolean;
  scrollDirection: 'up' | 'down' | null;
  scrollProgress: number;
  isVisible: boolean;
}

export function useHeaderAnimations() {
  const pathname = usePathname();
  const [state, setState] = useState<HeaderAnimationState>({
    scrolled: false,
    scrollDirection: null,
    scrollProgress: 0,
    isVisible: true,
  });

  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    // Throttle scroll events for better performance
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollProgress = documentHeight > 0 ? scrollY / documentHeight : 0;

          setState(prevState => ({
            scrolled: scrollY > 10,
            scrollDirection: scrollY > lastScrollY ? 'down' : scrollY < lastScrollY ? 'up' : prevState.scrollDirection,
            scrollProgress,
            isVisible: scrollY < 100 || scrollY < lastScrollY, // Masquer si scroll vers le bas après 100px
          }));

          setLastScrollY(scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Reset visibility on route change
  useEffect(() => {
    setState(prevState => ({ ...prevState, isVisible: true }));
  }, [pathname]);

  return state;
}

// Hook pour gérer les états de focus et hover des éléments interactifs
export function useInteractionState() {
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  const handleFocus = useCallback((elementId: string) => {
    setFocusedElement(elementId);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedElement(null);
  }, []);

  const handleMouseEnter = useCallback((elementId: string) => {
    setHoveredElement(elementId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredElement(null);
  }, []);

  return {
    focusedElement,
    hoveredElement,
    handleFocus,
    handleBlur,
    handleMouseEnter,
    handleMouseLeave,
  };
}

// Hook pour gérer l'état de la barre de recherche
export function useSearchState() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    // Ici, vous pourriez implémenter la logique de recherche
    // Par exemple, rechercher dans les pages, produits, etc.
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    isSearchFocused,
    searchQuery,
    searchResults,
    handleSearchFocus,
    handleSearchBlur,
    handleSearchChange,
    clearSearch,
  };
}