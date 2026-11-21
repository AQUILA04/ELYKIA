package com.optimize.elykia;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ModularityTests {

    private static final ApplicationModules MODULES =
            ApplicationModules.of(OptimizeElykiaCoreApplication.class);

    @Test
    void verifiesModularStructure() {
        MODULES.verify();
        var expected = java.util.List.of(
                "entities", "securities", "client", "shared", "notification", "organization",
                "inventory", "finance", "sale", "tontine", "carnet", "recruitment", "ai", "apprelease", "core");
        assertEquals(expected.size(), MODULES.stream().count());
        for (String name : expected) {
            var module = MODULES.getModuleByName(name);
            assertTrue(module.isPresent(), () -> "Expected module not found: " + name);
            assertTrue(module.get().getBasePackage().stream().findAny().isPresent(),
                    () -> "Expected non-empty module: " + name);
        }
    }

    @Test
    void writesModuleDocumentation() {
        new Documenter(MODULES)
                .writeModulesAsPlantUml()
                .writeIndividualModulesAsPlantUml();
    }
}
