## Mental Model

Flatpack is a repo setup process. It gives an agent enough instructions and local building blocks to assemble a real target repo.

The current direction is:

1. Start from a real shell repo.
2. Layer project types into that shell.
3. Use standard scaffolding tools for thick app frameworks.
4. Copy and augment simple local examples for lightweight project types.

The shell is represented by `flatpack-shell/`. It should be a working monorepo, not pseudo-template code. It should install, typecheck, test, build, and run locally. When setup docs say to start from the base shell, the target-agent-facing form is expected to be something like:

```bash
fm clone example-repo ./
```

After that, target setup instructions can tell the agent to create Vite or Next.js apps with the appropriate external scaffolders, and to create simple backends and libraries by copying examples from the shell and running augment scripts.
