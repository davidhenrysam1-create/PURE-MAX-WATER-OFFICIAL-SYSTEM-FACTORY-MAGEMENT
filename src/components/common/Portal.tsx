/**
 * Portal — renders children into <body> (outside #app-main-layout).
 *
 * WHY THIS EXISTS
 * ---------------
 * Two separate CSS mechanics were silently breaking every overlay that was
 * declared inside the app's <header>:
 *
 *  1. `backdrop-filter` (used by the sticky header via `backdrop-blur-md`)
 *     makes an element a CONTAINING BLOCK for `position: fixed` descendants.
 *     So an overlay written as `fixed inset-0` inside the header was not
 *     positioned against the viewport — it was positioned against the 4rem-tall
 *     header box. That is why the "Share App" dialog appeared squashed into the
 *     top strip / seemingly "cut off behind the top navigation".
 *
 *  2. The header also carries `overflow-hidden` (and `overflow-x-hidden`) to
 *     clip its full-bleed banner image. Any child that overflows the header's
 *     box is clipped outright, so dropdowns and modals lost everything below
 *     the header's bottom edge.
 *
 * Rendering through a portal into <body> sidesteps both: the overlay escapes
 * the header's containing block and its clipping context, while still
 * participating in React's normal event/state flow.
 *
 * The `dark` class is mirrored onto <html> by AppContext, so `dark:` styles
 * keep working for portalled content even though it is outside
 * #app-main-layout.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  /** Optional id so specific overlays can be targeted in tests / debugging. */
  containerId?: string;
}

export const Portal = ({ children, containerId }: PortalProps) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (containerId) {
      let el = document.getElementById(containerId);
      if (!el) {
        el = document.createElement('div');
        el.id = containerId;
        document.body.appendChild(el);
      }
      setContainer(el);
      return;
    }

    setContainer(document.body);
  }, [containerId]);

  if (!container) return null;
  return createPortal(children, container);
};

export default Portal;
