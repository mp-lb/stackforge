## Mental Model

FSS Stack is a repo setup process. It gives an agent enough instructions and
local building blocks to assemble a real target repo.

The current direction is:

1. Start from a real shell repo.
2. Layer project types into that shell.
3. Use standard scaffolding tools for thick app frameworks.
4. Copy and augment simple local examples for lightweight project types.

The shell is represented by `fssstack/shell/`. It is a working monorepo, not
pseudo-template code. It should install, typecheck, test, build, and run
locally. The published setup process fetches it into a target repository.

Target setup instructions create Vite or Next.js apps with the appropriate
external scaffolders, and create simple backends and libraries by copying shell
examples and applying the documented wiring.
