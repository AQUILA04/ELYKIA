---
trigger: always_on
---

When working on 'mobile/'

All data requests must be filtered by the logged-in user (e.g., 'commercialUsername'). The solution must be generic to handle different column names ('commercial', 'commercialId', 'commercialUsername') based on the entity. This ensures users only access their authorized data.