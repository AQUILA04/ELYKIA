@org.springframework.modulith.ApplicationModule(
        id = "core",
        displayName = "Core Business",
        allowedDependencies = {"entities", "securities", "client"}
)
package com.optimize.elykia.core;
