# PWA offline and update policy

The application shell, interface translations and generated assets are cached
by Angular's service worker. A successfully opened release can therefore be
reloaded without a network connection.

Map tiles are different: the service worker keeps at most 800 tiles for 15
days with a cache-first strategy. Offline use only includes tiles that were
viewed previously; OsmGo does not download whole basemaps for offline use.

When Angular reports `VERSION_READY`, the menu displays the update action. A
reload activates the new version. The Playwright PWA scenario installs a
release, exposes a second manifest, activates it and verifies another reload
while offline. `npm run pwa:validate:built` also rejects missing literal paths
and stale asset declarations in a built `www` directory.
