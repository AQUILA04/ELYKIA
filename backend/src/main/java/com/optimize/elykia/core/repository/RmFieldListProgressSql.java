package com.optimize.elykia.core.repository;

/**
 * Prédicats du filtre Terrain ({@code progress}, {@code since}).
 * À garder alignés avec {@code RmFieldProgressRules} :
 * TODO = aucun contrôle, DONE = écart ouvert ou dernier contrôle dans la fenêtre,
 * ALL = pas de restriction (y compris les contrôles clôturés hors fenêtre).
 */
public final class RmFieldListProgressSql {

    private RmFieldListProgressSql() {
    }

    public static final String CREDIT_NATIVE = """
              AND (
                   :progress = 'ALL'
                   OR (
                        :progress = 'TODO'
                        AND NOT EXISTS (
                             SELECT 1 FROM credit_field_control cfc
                             WHERE cfc.credit_id = c.id
                               AND cfc.visibility = 'ENABLED'
                        )
                   )
                   OR (
                        :progress = 'DONE'
                        AND EXISTS (
                             SELECT 1 FROM credit_field_control latest
                             WHERE latest.credit_id = c.id
                               AND latest.visibility = 'ENABLED'
                               AND latest.id = (
                                    SELECT c2.id FROM credit_field_control c2
                                    WHERE c2.credit_id = c.id
                                      AND c2.visibility = 'ENABLED'
                                    ORDER BY c2.observed_at DESC, c2.id DESC
                                    LIMIT 1
                               )
                               AND (
                                    latest.observed_at >= :since
                                    OR (
                                         latest.status = 'ECART'
                                         AND ABS(latest.difference_amount) > 0.5
                                         AND NOT EXISTS (
                                              SELECT 1 FROM carnet_ecart_decision d
                                              WHERE d.credit_field_control_id = latest.id
                                                AND d.visibility = 'ENABLED'
                                                AND d.status IN ('ACCEPTED', 'REJECTED')
                                         )
                                    )
                               )
                        )
                   )
              )
            """;

    public static final String TONTINE_JPQL = """
                  AND (
                    :progress = 'ALL'
                    OR (
                      :progress = 'TODO'
                      AND NOT EXISTS (
                        SELECT 1 FROM TontineMemberFieldControl ctrl
                        WHERE ctrl.tontineMember = tm
                          AND ctrl.state = com.optimize.common.entities.enums.State.ENABLED
                      )
                    )
                    OR (
                      :progress = 'DONE'
                      AND EXISTS (
                        SELECT 1 FROM TontineMemberFieldControl latest
                        WHERE latest.tontineMember = tm
                          AND latest.state = com.optimize.common.entities.enums.State.ENABLED
                          AND latest.observedAt = (
                            SELECT MAX(other.observedAt) FROM TontineMemberFieldControl other
                            WHERE other.tontineMember = tm
                              AND other.state = com.optimize.common.entities.enums.State.ENABLED
                          )
                          AND (
                            latest.observedAt >= :since
                            OR (
                              latest.status = com.optimize.elykia.core.enumaration.FieldControlStatus.ECART
                              AND EXISTS (
                                SELECT 1 FROM TontineMemberFieldControlLine line
                                WHERE line.fieldControl = latest
                                  AND line.state = com.optimize.common.entities.enums.State.ENABLED
                                  AND ABS(line.differenceAmount) > 0.5
                                  AND NOT EXISTS (
                                    SELECT 1 FROM CarnetEcartDecision decision
                                    WHERE decision.tontineLineId = line.id
                                      AND decision.state = com.optimize.common.entities.enums.State.ENABLED
                                      AND (
                                        decision.status = com.optimize.elykia.core.enumaration.CarnetEcartStatus.ACCEPTED
                                        OR decision.status = com.optimize.elykia.core.enumaration.CarnetEcartStatus.REJECTED
                                      )
                                  )
                              )
                            )
                          )
                      )
                    )
                  )
                """;
}
