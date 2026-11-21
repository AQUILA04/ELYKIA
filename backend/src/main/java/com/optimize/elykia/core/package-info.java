@org.springframework.modulith.ApplicationModule(
        id = "core",
        displayName = "Core Business",
        allowedDependencies = {"entities", "securities", "client", "shared", "notification :: api", "organization"}
)
package com.optimize.elykia.core;
