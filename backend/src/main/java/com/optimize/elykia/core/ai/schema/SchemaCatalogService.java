package com.optimize.elykia.core.ai.schema;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchemaCatalogService {

    private final ObjectMapper objectMapper;

    @Getter
    private String catalogJson = "{}";

    @Getter
    private Set<String> allowedTables = new HashSet<>();

    @PostConstruct
    void load() {
        try (InputStream in = new ClassPathResource("ai/schema-catalog.json").getInputStream()) {
            JsonNode root = objectMapper.readTree(in);
            catalogJson = objectMapper.writeValueAsString(root);
            if (root.has("tables")) {
                root.get("tables").forEach(t -> allowedTables.add(t.get("name").asText().toLowerCase()));
            }
            if (root.has("views")) {
                root.get("views").forEach(v -> allowedTables.add(v.get("name").asText().toLowerCase()));
            }
            log.info("Schema catalog loaded: {} tables/views", allowedTables.size());
        } catch (Exception e) {
            log.error("Failed to load schema catalog", e);
        }
    }

    public String getCatalogForPrompt() {
        return catalogJson;
    }

    public boolean isTableAllowed(String tableName) {
        return allowedTables.contains(tableName.toLowerCase());
    }

    public java.util.Map<String, String> tablesWithRowLevelFilter() {
        java.util.Map<String, String> result = new java.util.LinkedHashMap<>();
        try {
            JsonNode root = objectMapper.readTree(catalogJson);
            if (!root.has("tables")) {
                return result;
            }
            StreamSupport.stream(root.get("tables").spliterator(), false)
                    .filter(t -> t.has("rowLevelFilter"))
                    .forEach(t -> result.put(
                            t.get("name").asText().toLowerCase(),
                            t.get("rowLevelFilter").asText()));
        } catch (Exception e) {
            log.warn("Could not parse row-level filter tables", e);
        }
        return result;
    }

    /** @deprecated use {@link #tablesWithRowLevelFilter()} */
    @Deprecated
    public Set<String> tablesWithCollectorFilter() {
        return tablesWithRowLevelFilter().keySet();
    }
}
