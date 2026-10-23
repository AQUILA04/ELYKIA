package com.optimize.elykia.core.db;

import com.optimize.elykia.core.enumaration.OperationType;
import org.junit.jupiter.api.Test;

import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Les tests Spring utilisent ddl-auto et n'appliquent pas les CHECK PostgreSQL.
 * Cette garde relit la dernière migration qui définit daily_operation_log_type_check
 * et vérifie qu'elle autorise chaque valeur de {@link OperationType}.
 */
class DailyOperationLogTypeConstraintTest {

    private static final Pattern VERSION = Pattern.compile("^V(\\d+)__.*\\.sql$");
    private static final Pattern QUOTED = Pattern.compile("'([A-Z0-9_]+)'");

    @Test
    void latestCheckAllowsEveryOperationType() throws Exception {
        Path latest = latestConstraintMigration();
        String sql = Files.readString(latest);
        Set<String> allowed = quotedValues(constraintBlock(sql));

        for (OperationType type : OperationType.values()) {
            assertTrue(allowed.contains(type.name()),
                    () -> latest.getFileName() + " n'autorise pas " + type.name()
                            + ". Valeurs présentes : " + allowed);
        }
    }

    private static Path latestConstraintMigration() throws Exception {
        Path dir = migrationDirectory();
        Path latest = null;
        int latestVersion = -1;
        try (Stream<Path> files = Files.list(dir)) {
            for (Path file : files.toList()) {
                Matcher matcher = VERSION.matcher(file.getFileName().toString());
                if (!matcher.matches()) {
                    continue;
                }
                String sql = Files.readString(file);
                if (!sql.contains("daily_operation_log_type_check")) {
                    continue;
                }
                int version = Integer.parseInt(matcher.group(1));
                if (version > latestVersion) {
                    latestVersion = version;
                    latest = file;
                }
            }
        }
        assertTrue(latest != null, "Aucune migration ne définit daily_operation_log_type_check");
        return latest;
    }

    private static Path migrationDirectory() throws URISyntaxException {
        URL resource = DailyOperationLogTypeConstraintTest.class.getClassLoader().getResource("db/migration");
        assertTrue(resource != null, "db/migration introuvable sur le classpath");
        return Path.of(resource.toURI());
    }

    private static String constraintBlock(String sql) {
        int start = sql.lastIndexOf("daily_operation_log_type_check");
        assertTrue(start >= 0, "Contrainte absente du fichier retenu");
        String tail = sql.substring(start);
        int end = tail.indexOf(");");
        assertTrue(end > 0, "Fin de contrainte introuvable");
        return tail.substring(0, end);
    }

    private static Set<String> quotedValues(String block) {
        Set<String> values = new LinkedHashSet<>();
        Matcher matcher = QUOTED.matcher(block);
        while (matcher.find()) {
            values.add(matcher.group(1));
        }
        return values;
    }
}
