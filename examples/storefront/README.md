# Storefront scanner fixture

This small Checkout project is the initial M2 acceptance fixture. It is source
for static analysis, not a runnable storefront. Its framework imports are
intentional; no application dependencies need to be installed to read its AST.

The expected entities, relations, and negative cases are specified in
../../docs/m2-scanner-contract.md. The tsconfig limits the scan to src.
