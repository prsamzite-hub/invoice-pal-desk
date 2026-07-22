Remove the "Firmaer" tab from the app.

1. `src/components/app-sidebar.tsx`: remove the Firmaer nav item (line 27) and the unused `Store` icon import.
2. Delete the route file `src/routes/_authenticated/app.vendors.tsx` so `/app/vendors` no longer exists (routeTree regenerates automatically).

No other pages link to `/app/vendors`, so nothing else needs to change.