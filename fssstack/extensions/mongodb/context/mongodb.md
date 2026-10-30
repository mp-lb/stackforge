## MongoDB

This project uses MongoDB. Reuse its existing connection and collection/schema helpers. Application configuration supplies the connection URL and database name; shared packages should not independently load runtime environment files.

Use the MongoDB service and dynamic port configured in `zap.yaml` for local work. Maintenance/reset tasks are destructive: verify the resolved target is the intended disposable local database and follow the project's data policy before running them. Close clients during script/test cleanup.

Setup and updates: `fm read extensions/mongodb/README.md --store mp-lb/fssstack`.
