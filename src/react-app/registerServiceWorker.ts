type ServiceWorkerContainerLike = Pick<ServiceWorkerContainer, "register">;

export function registerServiceWorker(
  isProduction: boolean,
  serviceWorkerContainer:
    ServiceWorkerContainerLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.serviceWorker,
): void {
  if (!isProduction || !serviceWorkerContainer) return;

  void serviceWorkerContainer.register("/sw.js").catch(() => {
    // Service Worker is an enhancement; a registration failure must not block the app.
  });
}
