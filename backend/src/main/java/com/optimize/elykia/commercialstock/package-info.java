/**
 * Commercial Stock (Continuous Consignment) — stock confié à chaque commercial, modélisé comme une
 * position continue (collector, article, activité) composée de couches FIFO à coût d'achat immuable,
 * avec un ledger append-only de mouvements et des snapshots périodiques.
 * Les autres modules n'accèdent à ce module que via {@code commercialstock :: api}.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Commercial Stock (Continuous Consignment)",
        type = org.springframework.modulith.ApplicationModule.Type.CLOSED,
        allowedDependencies = {"entities", "securities", "shared", "inventory", "organization"}
)
package com.optimize.elykia.commercialstock;
