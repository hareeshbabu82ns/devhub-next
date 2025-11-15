/**
 * Focus Management Utilities
 * Provides utilities for managing focus within components and implementing focus traps
 * for modal overlays, popups, and other UI elements.
 */

/**
 * List of focusable element selectors
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
];

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = FOCUSABLE_SELECTORS.join(', ');
  const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  
  return elements.filter((element) => {
    // Filter out elements that are not visible
    return (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      !element.hasAttribute('hidden') &&
      window.getComputedStyle(element).visibility !== 'hidden'
    );
  });
}

/**
 * Create a focus trap within a container
 * Returns cleanup function to remove event listeners
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: if first element is focused, cycle to last
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: if last element is focused, cycle to first
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element on mount
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to a previously focused element
 */
export function createFocusRestoration(): {
  save: () => void;
  restore: () => void;
} {
  let previouslyFocusedElement: HTMLElement | null = null;

  return {
    save: () => {
      previouslyFocusedElement = document.activeElement as HTMLElement;
    },
    restore: () => {
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
      }
    },
  };
}

/**
 * ARIA live region announcer for screen readers
 */
export class AriaAnnouncer {
  private liveRegion: HTMLElement | null = null;

  constructor(politeness: 'polite' | 'assertive' = 'polite') {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', politeness);
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, clearAfter = 3000): void {
    if (!this.liveRegion) return;

    this.liveRegion.textContent = message;

    // Clear the message after specified time
    if (clearAfter > 0) {
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, clearAfter);
    }
  }

  /**
   * Clean up the announcer
   */
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}

/**
 * Create a singleton aria announcer
 */
let globalAnnouncer: AriaAnnouncer | null = null;

export function getAriaAnnouncer(
  politeness: 'polite' | 'assertive' = 'polite'
): AriaAnnouncer {
  if (!globalAnnouncer) {
    globalAnnouncer = new AriaAnnouncer(politeness);
  }
  return globalAnnouncer;
}

/**
 * Generate a unique ID for ARIA attributes
 */
let idCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Helper to create ARIA label pairs (labelledby/describedby)
 */
export interface AriaLabelPair {
  labelId: string;
  descriptionId: string;
  labelProps: { id: string };
  descriptionProps: { id: string };
  controlProps: { 'aria-labelledby': string; 'aria-describedby': string };
}

export function createAriaLabelPair(prefix = 'control'): AriaLabelPair {
  const labelId = generateAriaId(`${prefix}-label`);
  const descriptionId = generateAriaId(`${prefix}-desc`);

  return {
    labelId,
    descriptionId,
    labelProps: { id: labelId },
    descriptionProps: { id: descriptionId },
    controlProps: {
      'aria-labelledby': labelId,
      'aria-describedby': descriptionId,
    },
  };
}
