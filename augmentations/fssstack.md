# Fssstack augmentation


## When to use

Apply this after creating a new fssstack project.

## Instructions

- Docs folder

### ArcNet

Ask whether the project will deploy any applications through ArcNet. If yes, use **full ArcNet** and follow the [ArcNet project setup](../arcnet/SETUP.md), including the shared secrets and variables setup and the selected deployment capabilities.

If no, ask whether to set up the basic ArcNet secrets and variables infrastructure. If yes, use **minimal ArcNet**: follow the [ArcNet project setup](../arcnet/SETUP.md) for its shared setup, with no application deployment services or Vercel sites. If no, choose **no ArcNet** and skip ArcNet configuration and provisioning entirely.

Use `projectSlug` and `githubRepository` from `fssstack.yaml` when following the ArcNet setup. Record the chosen implementation in the project's context so later work can extend it deliberately.
