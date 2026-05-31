import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const scrollToElement = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

export const handleNavigationClick = (href: string) => {
  const elementId = href.replace('#', '');
  scrollToElement(elementId);
};

export const getBackgroundColor = (backgroundColor: string | undefined, theme: any) => {
  switch (backgroundColor) {
    case 'secondaryBackground': return theme.palette.secondaryBackground;
    case 'background': return theme.palette.background;
    case 'muted': return theme.palette.muted;
    case 'primary': return theme.palette.primary;
    default: return theme.palette.background;
  }
};
