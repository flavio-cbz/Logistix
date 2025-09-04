import { useEffect } from 'react';
import { cn } from '@/lib/utils'

interface SkipLink {
  href: string
  label: string
  description: string // Corrected from _description
}

const skipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Aller au contenu principal',
    description: 'Passer la navigation et aller directement au contenu principal' // Corrected from _description
  },
  {
    href: '#main-nav',
    label: 'Aller à la navigation principale',
    description: 'Accéder au menu de navigation principal' // Corrected from _description
  },
  {
    href: '#search',
    label: 'Aller à la recherche',
    description: 'Accéder à la fonction de recherche' // Corrected from _description
  },
]

interface SkipLinksProps {
  className?: string
}

export function SkipLinks({ className }: SkipLinksProps) {
  return (
    <nav aria-label="Liens d'accès rapide" className={cn("sr-only focus-within:not-sr-only", className)}>
      <ul className="flex flex-col p-4 space-y-2 bg-background shadow-lg absolute top-0 left-0 z-50">
        {skipLinks.map((link, index) => ( // Added index to map function
          <li key={index}>
            <a
              href={link.href}
              className="text-primary-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {link.label}
              <span className="sr-only"> ({link.description})</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function useLandmarks() {
  useEffect(() => {
    // Add landmark navigation with F6
    const handleLandmarkNavigation = (event: KeyboardEvent) => {
      if (event.key === 'F6') {
        event.preventDefault();
        
        const landmarks = document.querySelectorAll(`
          main, nav, aside, header, footer,
          [role="main"], [role="navigation"], [role="complementary"], 
          [role="banner"], [role="contentinfo"], [role="search"]
        `);
        
        const currentFocus = document.activeElement;
        let currentIndex = -1;
        
        // Find current landmark
        landmarks.forEach((landmark, index) => {
          if (landmark.contains(currentFocus) || landmark === currentFocus) {
            currentIndex = index;
          }
        });
        
        // Move to next landmark
        const nextIndex = (currentIndex + 1) % landmarks.length;
        const nextLandmark = landmarks[nextIndex] as HTMLElement;
        
        if (nextLandmark) {
          // Make focusable if not already
          const originalTabIndex = nextLandmark.getAttribute('tabindex');
          if (!originalTabIndex) {
            nextLandmark.setAttribute('tabindex', '-1');
          }
          
          nextLandmark.focus();
          nextLandmark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Announce the landmark
          const label = nextLandmark.getAttribute('aria-label') || 
                       nextLandmark.getAttribute('aria-labelledby') ||
                       nextLandmark.tagName.toLowerCase();
          
          // Create announcement
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'assertive');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = `Navigation vers: ${label}`;
          document.body.appendChild(announcement);
          
          setTimeout(() => {
            document.body.removeChild(announcement);
            if (!originalTabIndex) {
              nextLandmark.removeAttribute('tabindex');
            }
          }, 1000);
        }
      }
    };

    document.addEventListener('keydown', handleLandmarkNavigation);

    return () => {
      document.removeEventListener('keydown', handleLandmarkNavigation);
    };
  }, []);
}