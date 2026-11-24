@org.springframework.modulith.ApplicationModule(
        displayName = "ReportingAndPortfolio",
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
                "tontine",
                "carnet",
                "customer :: api",
                "commercialstock :: api"
        }
)
package com.optimize.elykia.reporting;
