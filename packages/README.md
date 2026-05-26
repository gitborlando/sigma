# Workspace Packages

Internal packages should start as source packages and stay private until there is
a concrete publishing need.

Package defaults:

- `private: true`
- `type: module`
- explicit `exports`
- `typecheck` script

Keep package code independent from `apps/web`, React, DOM, Vite, and product
services unless the package is explicitly an app/runtime adapter.
