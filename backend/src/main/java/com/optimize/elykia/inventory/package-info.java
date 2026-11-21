@org.springframework.modulith.ApplicationModule(
        displayName = "Inventory & Catalog",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities", "client", "shared", "organization"}
)
package com.optimize.elykia.inventory;
