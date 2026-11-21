@org.springframework.modulith.ApplicationModule(
        displayName = "BusinessIntelligence",
        type = org.springframework.modulith.ApplicationModule.Type.CLOSED,
        allowedDependencies = {
                "entities",
                "securities",
                "client",
                "shared",
                "organization",
                "inventory",
                "finance",
                "sale",
                "tontine"
        }
)
package com.optimize.elykia.bi;
