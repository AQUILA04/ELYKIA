package com.optimize.elykia.shared.carnet;

import java.time.LocalDateTime;

/**
 * Entity exposing the carnet verification audit triplet.
 */
public interface CarnetVerifiable {

    Boolean getCarnetVerified();

    void setCarnetVerified(Boolean carnetVerified);

    void setCarnetVerifiedAt(LocalDateTime carnetVerifiedAt);

    void setCarnetVerifiedBy(String carnetVerifiedBy);
}
