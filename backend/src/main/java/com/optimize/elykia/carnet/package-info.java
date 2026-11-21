@org.springframework.modulith.ApplicationModule(
        displayName = "Carnet Verification, Ecarts & Recovery Field Plans",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities", "client", "shared", "notification :: api", "organization", "inventory", "finance", "sale", "tontine"}
)
package com.optimize.elykia.carnet;
