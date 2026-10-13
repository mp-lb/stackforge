# Extensions

Extensions add optional capabilities to an FSS Stack project, such as auth,
databases, queues, object storage, custom domains, and end-to-end testing.

Read the extension file for the capability you are adding and apply its local
project wiring. Extension docs should cover the app-level setup they require:
packages, code changes, local services, environment variables, and Zapper
configuration. [ArcNet](./arcnet.md) is the opt-in cloud deployment extension;
the base shell remains deployment-free. Apply it after the base project validates.

For a hosted web app in an Electron window, see [Electron](./electron.md).
