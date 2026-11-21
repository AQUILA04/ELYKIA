@org.springframework.modulith.ApplicationModule(
        displayName = "Finance & Cash Accounting",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities", "client", "shared", "organization", "inventory"}
)
package com.optimize.elykia.finance;
