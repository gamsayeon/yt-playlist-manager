const OBSERVER_THROTTLE_MS = 200;

let throttleTimer: ReturnType<typeof setTimeout> | null = null;

function onMutation(callback: () => void): MutationObserver {
  const observer = new MutationObserver(() => {
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