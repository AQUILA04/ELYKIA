@org.springframework.modulith.ApplicationModule(
        displayName = "Sales, Credits, Orders, Commercial Stock & Debts",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities", "client", "shared", "notification :: api", "organization", "inventory", "finance"}
)
package com.optimize.elykia.sale;
