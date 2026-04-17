---
trigger: always_on
---

when working on 'mobile/'
When developing new features in a local-first architecture, ensure that existing data initialization and synchronization logic (fetching data from API and storing locally) is preserved and not modified. New CRUD operations for features should interact directly with the local database, respecting the local-first principle where APIs are used only for initial data loading and explicit synchronization.