export function scrollToFirstFormError(): void {
  const firstError = document.querySelector(
    "[data-error='true'], .border-error-500, .border-accent-red-400"
  );
  if (firstError instanceof HTMLElement) {
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
