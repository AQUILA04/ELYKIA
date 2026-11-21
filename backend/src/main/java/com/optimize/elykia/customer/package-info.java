@org.springframework.modulith.ApplicationModule(
        displayName = "CustomerPortal",
        type = org.springframework.modulith.ApplicationModule.Type.CLOSED,
        allowedDependencies = {
                "entities",
                "securities",
                "client",
                "shared",
                "notification :: api",
                "organization",
                "inventory",
                "finance",
                "sale",
                "tontine"
        }
)
package com.optimize.elykia.customer;
