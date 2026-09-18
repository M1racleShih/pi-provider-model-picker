# Releasing

How to cut a release of this package and get it into the pi ecosystem.

## Distribution channels

pi packages have three install sources; this repo supports all of them:

| Source | Command | Notes |
|--------|---------|-------|
| npm | `pi install npm:pi-provider-model-picker` | Primary channel. Also auto-lists the package in the official [pi.dev package gallery](https://pi.dev/packages). |
| git | `pi install git:github.com/M1racleShih/pi-provider-model-picker` | Installs from a clone; `@vX.Y.Z` pins a tag. |
| local | `pi install /path/to/repo` | Dev workflow (currently installed this way). |

There is no manual submission for the gallery: **pi.dev indexes every npm
package carrying the `pi-package` keyword** (already set in `package.json`).
Publishing to npm is the only registration step.

## Prerequisites (one-time)

```bash
npm login          # create/verify account at npmjs.com
npm whoami         # confirm
```

npm requires **2FA for all publishes**: either account-level 2FA (TOTP
authenticator app or security key — email sign-in codes do NOT count as
publish OTPs), or a Granular Access Token created with the "Bypass two-factor
authentication" checkbox checked (token creation is the only time it can be
enabled). With account 2FA enabled, `npm publish` prompts for the OTP, or
pass it directly: `npm publish --otp=123456`.

## Release steps

1. Update `version` in `package.json` (semver) and add a `CHANGELOG.md` entry.
2. Verify the tarball contents:

   ```bash
   npm pack --dry-run
   # must list: extensions/index.ts, package.json, README, CHANGELOG, LICENSE
   ```

3. Run checks:

   ```bash
   npm test && npm run typecheck
   ```

4. Publish:

   ```bash
   npm publish
   # scoped accounts may need: npm publish --access public
   ```

5. Verify install from the registry in a clean shell:

   ```bash
   pi -e npm:pi-provider-model-picker
   ```

6. Tag and push (lets git-source users pin a version):

   ```bash
   git tag v0.1.0
   git push origin main --tags
   ```

7. Check the gallery: the package appears at
   `https://pi.dev/packages/pi-provider-model-picker` after npm's registry
   metadata is indexed (usually within minutes; the gallery sorts by recency
   on the [catalog page](https://pi.dev/packages)).

## Gallery preview (optional)

Add a screenshot or demo video to the `pi` manifest for a gallery preview:

```json
"pi": {
  "extensions": ["./extensions/index.ts"],
  "image": "https://raw.githubusercontent.com/M1racleShih/pi-provider-model-picker/main/docs/screenshot.png"
}
```

- `image`: PNG / JPEG / GIF / WebP (record with asciinema + agg, or a terminal screenshot)
- `video`: MP4, autoplays on hover, takes precedence over `image`

## Updating an installed package

```bash
pi update --extensions   # user side, updates everything unpinned
pi update npm:pi-provider-model-picker
```

Versioned specs (`npm:pi-provider-model-picker@0.1.0`) and git ref pins stay
pinned; users must change the spec to move them.
