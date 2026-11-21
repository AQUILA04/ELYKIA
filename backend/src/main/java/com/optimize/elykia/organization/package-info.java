@org.springframework.modulith.ApplicationModule(
        id = "organization",
        displayName = "Organization & Staff",
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"entities", "securities", "client", "shared"}
)
package com.optimize.elykia.organization;
