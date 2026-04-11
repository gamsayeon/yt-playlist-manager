const OBSERVER_THROTTLE_MS = 500;

let throttleTimer: ReturnType<typeof setTimeout> | null = null;

function onMutation(callback: () => void): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    const isOwnMutation = mutations.every((m) =>
      Array.from(m.addedNodes).every((node) => {
        if (node instanceof HTMLElement) {
          return (
            node.hasAttribute("data-ytpm-checkbox") ||
            node.hasAttribute("data-ytpm-fixed-container") ||
            node.closest("[data-ytpm-checkbox]") !== null ||
            node.closest("[data-ytpm-fixed-container]") !== null
          );
        }
        return false;
      })
    );

    if (isOwnMutation) return;
    if (throttleTimer) return;

    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      callback();
    }, OBSERVER_THROTTLE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

export { onMutation };