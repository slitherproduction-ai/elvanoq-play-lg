# Checkpoint 001 — LG webOS activation bootstrap

## Scope

Created the isolated LG webOS repository. No Android, Expo, Portal, Supabase schema, device records, playlists, credentials, licenses, payment records, or production configuration were changed.

## Delivered

- `appinfo.json` for the webOS package `com.elvanoq.play` at version `0.1.0`.
- TV-first activation screen with 4-way remote focus styling.
- Explicit consent screen before using the webOS Device Unique ID service.
- LGUDID lookup through `luna://com.webos.service.sm/deviceid/getIDs` when running on a compatible LG TV.
- Stable, app-local fallback identity for simulator/desktop development only.
- Portal status lookup through the existing `portal-control` `license-status` action.
- Portal URL centralized as `https://elvanoqplay.app`.

## Validation

- `node --check app.js`: passed.
- `git diff --check`: passed.
- Read-only `license-status` verification against the current Portal endpoint: returned HTTP 403 with `MAC ou chave inválidos.` for a synthetic identity, which confirms the endpoint rejected the unregistered device and did not grant access.

## Deliberate next work

1. Extend the Portal contract to persist `platform=webos` and a platform-specific device identifier, rather than modelling an LG identifier as a physical MAC address.
2. Add the first-class LG device linking flow to the Portal UI.
3. Implement authenticated playlist sync, Xtream/M3U login, catalog and native webOS player.
4. Add package artwork and the GitHub Actions IPK pipeline after the first TV install target is confirmed.
