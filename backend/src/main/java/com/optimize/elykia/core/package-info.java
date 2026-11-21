@org.springframework.modulith.ApplicationModule(
        id = "core",
        displayName = "Core Business",
        allowedDependencies = {"entities", "securities", "client", "shared"}
)
package com.optimize.elykia.core;
