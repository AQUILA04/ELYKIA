@org.springframework.modulith.ApplicationModule(
        displayName = "Tontine & Tontine Stock",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities", "client", "shared", "notification :: api", "organization", "inventory", "finance", "sale", "commercialstock :: api"}
)
package com.optimize.elykia.tontine;
