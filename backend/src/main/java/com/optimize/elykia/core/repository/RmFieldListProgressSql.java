package com.optimize.elykia.core.repository;

/**
 * Prédicats du filtre Terrain ({@code progress}).
 * À garder alignés avec {@code RmFieldProgressRules} :
 * TODO = aucun contrôle, DONE = au moins un contrôle (quelle que soit sa date),
 * ALL = pas de restriction.
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
                             SELECT 1 FROM credit_field_control done
                             WHERE done.credit_id = c.id
                               AND done.visibility = 'ENABLED'
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
                        SELECT 1 FROM TontineMemberFieldControl done
                        WHERE done.tontineMember = tm
                          AND done.state = com.optimize.common.entities.enums.State.ENABLED
                      )
                    )
                  )
                """;
}
