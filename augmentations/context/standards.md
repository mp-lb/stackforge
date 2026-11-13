## MAP Lab guidance

When asked to read a standard, use MAP Lab's current version: `fm ls --store mp-lb/dev`, then `fm read <file>.md --store mp-lb/dev`. Match the requested subject to the actual listed filename before reading it. This includes code style, component decomposition, CRUD, errors, tRPC, logging, event schemas, libraries, publishing and CLI conventions.

Shared extension setup remains in `mp-lb/fssstack`: `fm ls extensions --store mp-lb/fssstack` and `fm read extensions/<extension>/README.md --store mp-lb/fssstack`.

Discover company augmentations with `fm ls --store mp-lb/augmentations`, then `fm read <file>.md --store mp-lb/augmentations`. Keep these MAP Lab conventions out of public Fssstack defaults. Read guidance remotely; do not create local mirrors of standards, extensions, skills or examples.
