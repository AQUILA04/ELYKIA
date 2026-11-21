package com.optimize.elykia.core.config;

import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.joran.JoranConfigurator;
import ch.qos.logback.core.status.Status;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NonBlankPropertyConditionTest {

    @Test
    void evaluatesTrueOnlyWhenPropertyIsNonBlank() {
        LoggerContext context = new LoggerContext();
        context.putProperty("LOKI_API_KEY", "secret-token");

        NonBlankPropertyCondition condition = new NonBlankPropertyCondition();
        condition.setContext(context);
        condition.setLocalPropertyContainer(context);
        condition.setKey("LOKI_API_KEY");
        condition.start();

        assertEquals("LOKI_API_KEY", condition.getKey());
        assertTrue(condition.isStarted());
        assertTrue(condition.evaluate());

        context.putProperty("LOKI_API_KEY", "   ");
        assertFalse(condition.evaluate());

        context.putProperty("LOKI_API_KEY", "");
        assertFalse(condition.evaluate());
    }

    @Test
    void doesNotStartWithoutKey() {
        LoggerContext context = new LoggerContext();
        NonBlankPropertyCondition condition = new NonBlankPropertyCondition();
        condition.setContext(context);
        condition.start();

        assertFalse(condition.isStarted());
        assertFalse(condition.evaluate());
    }

    @Test
    void logbackJoranParsesConditionWithoutJanino(@TempDir Path tempDir) throws Exception {
        String xml = """
                <configuration>
                    <property name="LOG_DIR" value="%s"/>
                    <condition class="com.optimize.elykia.core.config.NonBlankPropertyCondition">
                        <key>LOKI_API_KEY</key>
                    </condition>
                    <if>
                        <then>
                            <appender name="CONDITIONAL_MEM" class="ch.qos.logback.core.read.ListAppender"/>
                            <root level="INFO">
                                <appender-ref ref="CONDITIONAL_MEM"/>
                            </root>
                        </then>
                        <else>
                            <root level="INFO"/>
                        </else>
                    </if>
                </configuration>
                """.formatted(tempDir.toAbsolutePath());

        // Without LOKI_API_KEY -> takes <else>, no CONDITIONAL_MEM appender attached
        LoggerContext withoutKey = new LoggerContext();
        JoranConfigurator configuratorWithout = new JoranConfigurator();
        configuratorWithout.setContext(withoutKey);
        configuratorWithout.doConfigure(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));

        List<Status> errorsWithout = withoutKey.getStatusManager().getCopyOfStatusList().stream()
                .filter(s -> s.getLevel() == Status.ERROR)
                .toList();
        assertEquals(List.of(), errorsWithout, () -> "Unexpected Logback errors: " + errorsWithout);
        assertNull(withoutKey.getLogger("ROOT").getAppender("CONDITIONAL_MEM"));

        // With LOKI_API_KEY -> takes <then>, CONDITIONAL_MEM appender is attached
        LoggerContext withKey = new LoggerContext();
        withKey.putProperty("LOKI_API_KEY", "glc_test_key");
        JoranConfigurator configuratorWith = new JoranConfigurator();
        configuratorWith.setContext(withKey);
        configuratorWith.doConfigure(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));

        List<Status> errorsWith = withKey.getStatusManager().getCopyOfStatusList().stream()
                .filter(s -> s.getLevel() == Status.ERROR)
                .toList();
        assertEquals(List.of(), errorsWith, () -> "Unexpected Logback errors: " + errorsWith);
        assertNotNull(withKey.getLogger("ROOT").getAppender("CONDITIONAL_MEM"));
    }
}
