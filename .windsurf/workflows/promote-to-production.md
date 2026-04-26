---
description: Promote staging to production (merge staging -> main and push)
---

1. Make sure you are on the staging branch and everything is committed
// turbo
2. Run the promote script
```
git checkout main; git merge staging --no-edit; git push origin main; git checkout staging
```

This will:
- Switch to main
- Merge all staging changes in
- Push to origin/main (triggers Railway production deploy)
- Switch back to staging so you can keep working
