@org.springframework.modulith.ApplicationModule(
        id = "shared",
        displayName = "Shared Kernel",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities"}
)
package com.optimize.elykia.shared;
