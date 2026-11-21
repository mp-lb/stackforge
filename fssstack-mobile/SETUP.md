# Set up an Expo mobile project

1. Create the mobile repository under its owning organization and clone it.
2. Scaffold the standalone app with `npx create-expo-app@latest . --template tabs@latest --no-install`, then run `npm install`.
3. Run `npm exec --yes --package=@mp-lb/expo-release@0.1.0 -- expo-release-setup . --replace-app-json` to install the shared config and example GitHub Actions callers.
4. Fill `inputs.env` from the generated example and run `npm exec --yes --package=@mp-lb/expo-release@0.1.0 -- expo-release-apply-inputs inputs.env .`.
5. Link the app with `eas init`, add its project ID to `inputs.env`, and rerun the input command. Set the app-specific store profiles and credentials using the package documentation.
6. Set the checks with `npm pkg set 'scripts.lint=expo lint' 'scripts.typecheck=tsc --noEmit'` and run `npm run lint` once to set up ESLint.
7. Add the native flow against the existing API, run `zap task check`, and verify a native development build. Follow [First build](BOOTSTRAP.md) for store binaries.

[Tools package and commands](https://github.com/mp-lb/tools/tree/main/packages/expo-release) · [React Native integration](SETUP_REACT_NATIVE.md) · [Mobile app release checklist](https://hyperdoc.forumlabs.net/6af52eaf-37a0-451d-b55b-a852da302bf5)
