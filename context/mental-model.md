## Mental Model

FSS Stack is a repo setup process. It gives an agent enough instructions and
local building blocks to assemble a real target repo.

The current direction is:

1. Start from a real shell repo.
2. Layer project types into that shell.
3. Use standard scaffolding tools for thick app frameworks.
4. Copy and augment simple local examples for lightweight project types.

The shell in `fssstack/shell/` is a lean collection of compilable reference code, not a maintained starter application. Keep just enough code to demonstrate package boundaries, Fastify composition, structured logging and an example procedure. It should install, typecheck, test and build so the references remain trustworthy. Create the target application's hello-world UI/API connection by following setup instructions rather than maintaining it in the shell. The base carries no authentication policy; selected extensions add it.

Target setup instructions create Vite or Next.js apps with the appropriate
external scaffolders, and create simple backends and libraries by copying shell
examples and applying the documented wiring.
