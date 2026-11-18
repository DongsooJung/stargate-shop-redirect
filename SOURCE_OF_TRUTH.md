# Source of truth

> **Current production deployment repository**

- Domain: `shop.stargateedu.co.kr`
- Repository: `DongsooJung/stargate-shop-redirect`
- Deployment: GitHub Pages from `main`
- Verified from DNS, HTTPS live response, and exact `checkout.html` comparison: 2026-09-20

## Editing policy

1. Apply production storefront changes in this repository while the custom domain is attached here.
2. Keep credentials and payment secret keys out of this public repository.
3. Validate the live domain after every merge to `main`.
4. `DongsooJung/stargateedu-shop` is a staged replacement and is not the live Pages source until the custom domain and Pages settings are explicitly migrated.
