@org.springframework.modulith.ApplicationModule(
        id = "core",
        displayName = "Core Business",
        allowedDependencies = {"entities", "securities", "client", "shared", "notification :: api", "organization", "inventory", "finance", "sale", "tontine", "carnet"}
)
package com.optimize.elykia.core;
