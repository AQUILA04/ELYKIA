@org.springframework.modulith.ApplicationModule(
        id = "client",
        displayName = "Client & Storage",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities", "shared"}
)
package com.optimize.elykia.client;
