@org.springframework.modulith.ApplicationModule(
        displayName = "PlatformBootstrap",
        type = org.springframework.modulith.ApplicationModule.Type.CLOSED,
        allowedDependencies = {
                "entities",
                "securities",
                "client",
                "shared",
                "organization",
                "finance",
                "sale"
        }
)
package com.optimize.elykia.bootstrap;
