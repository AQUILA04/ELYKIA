package com.optimize.elykia.sale.domain;

public enum LateType {
    /** Date de fin prévue dépassée uniquement */
    DELAI,
    /** Nombre d'échéances payées insuffisant par rapport aux jours écoulés */
    ECHEANCE
}
