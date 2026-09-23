---
name: Upload asset persistence
description: Durable handling of logo and hero image files referenced by site settings.
---

Image settings can outlive local upload files after a workspace/runtime reset. A stored `/uploads/...` path is only valid while the corresponding file exists on disk.

**Why:** Missing local files were returned as the SPA HTML, which browsers displayed as broken logo and hero images.

**How to apply:** Use a persistent upload backend when available, validate or gracefully fall back when a stored asset is missing, and verify the image URL returns image bytes rather than HTML.