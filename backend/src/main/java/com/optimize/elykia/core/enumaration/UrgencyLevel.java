package com.optimize.elykia.core.enumaration;

/**
 * Niveau d'urgence d'un crédit par rapport à sa date de fin prévue.
 */
public enum UrgencyLevel {
    /** expectedEndDate == today */
    TODAY,
    /** expectedEndDate == today + 1 */
    TOMORROW,
    /** expectedEndDate dans 2 à 6 jours */
    THIS_WEEK,
    /** expectedEndDate dans 7 jours ou plus */
    FUTURE
}
