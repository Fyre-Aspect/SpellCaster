// Enter and Space both mean "yes, do the highlighted thing" on every
// non-typing screen. ("Spacebar" is IE/old-Edge's name for the key.)
export function isConfirmKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.key === "Enter" || e.key === " " || e.key === "Spacebar";
}

// True when the keypress landed on something that activates itself — a
// focused button or link handles Enter/Space natively, so a global handler
// must stay out of the way rather than firing the action twice.
export function onNativeControl(e) {
  const el = e.target instanceof HTMLElement ? e.target : null;
  return !!el?.closest("button, input, textarea, select, a[href]");
}
