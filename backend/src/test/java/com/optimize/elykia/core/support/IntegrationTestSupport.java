package com.optimize.elykia.core.support;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Duration;
import java.util.function.IntSupplier;
import java.util.function.Supplier;
import java.util.stream.Stream;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared infrastructure for Spring integration tests.
 *
 * <p>Each test JVM uses one disposable PostgreSQL database and one disposable
 * MinIO server. Standard Docker bridge networking is used in CI. The optional
 * host-network mode is reserved for sandbox environments that cannot create
 * bridge network rules.</p>
 */
public abstract class IntegrationTestSupport {

    private static final int POSTGRES_PORT = 5432;
    private static final int MINIO_API_PORT = 9000;
    private static final Duration SERVICE_STARTUP_TIMEOUT = Duration.ofSeconds(45);
    private static final boolean HOST_NETWORK = Boolean.getBoolean("elykia.testcontainers.host-network");

    private static final GenericContainer<?> POSTGRESQL = postgresqlContainer();
    private static final GenericContainer<?> MINIO = minioContainer();

    static {
        Startables.deepStart(Stream.of(POSTGRESQL, MINIO)).join();
        awaitTcpService("PostgreSQL", IntegrationTestSupport::postgresHost,
                IntegrationTestSupport::postgresPort);
        awaitTcpService("MinIO", IntegrationTestSupport::minioHost,
                IntegrationTestSupport::minioPort);
    }

    @DynamicPropertySource
    static void registerContainerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", IntegrationTestSupport::jdbcUrl);
        registry.add("spring.datasource.username", () -> "elykia");
        registry.add("spring.datasource.password", () -> "elykia");
        registry.add("minio.endpoint", IntegrationTestSupport::minioEndpoint);
        registry.add("minio.access-key", () -> "elykia-test-access-key");
        registry.add("minio.secret-key", () -> "elykia-test-secret-key");
    }

    private static NoWaitGenericContainer postgresqlContainer() {
        NoWaitGenericContainer container = noWaitContainer(DockerImageName.parse("postgres:16-alpine"))
                .withEnv("POSTGRES_DB", "elykia_test")
                .withEnv("POSTGRES_USER", "elykia")
                .withEnv("POSTGRES_PASSWORD", "elykia")
                .withNetworkMode(networkMode());
        if (!HOST_NETWORK) {
            container.withExposedPorts(POSTGRES_PORT);
        }
        return container;
    }

    private static NoWaitGenericContainer minioContainer() {
        NoWaitGenericContainer container = noWaitContainer(
                DockerImageName.parse("minio/minio:RELEASE.2025-04-22T22-12-26Z"))
                .withEnv("MINIO_ROOT_USER", "elykia-test-access-key")
                .withEnv("MINIO_ROOT_PASSWORD", "elykia-test-secret-key")
                .withCommand("server", "/data", "--console-address", ":9001")
                .withNetworkMode(networkMode());
        if (!HOST_NETWORK) {
            container.withExposedPorts(MINIO_API_PORT);
        }
        return container;
    }

    private static NoWaitGenericContainer noWaitContainer(DockerImageName imageName) {
        return new NoWaitGenericContainer(imageName);
    }

    private static final class NoWaitGenericContainer extends GenericContainer<NoWaitGenericContainer> {

        private NoWaitGenericContainer(DockerImageName imageName) {
            super(imageName);
        }

        @Override
        protected void waitUntilContainerStarted() {
            // The explicit TCP check below supports both bridge and host network modes.
        }
    }

    private static String networkMode() {
        return HOST_NETWORK ? "host" : "bridge";
    }

    private static String jdbcUrl() {
        return "jdbc:postgresql://" + postgresHost() + ":" + postgresPort() + "/elykia_test";
    }

    private static String minioEndpoint() {
        return "http://" + minioHost() + ":" + minioPort();
    }

    private static String postgresHost() {
        return HOST_NETWORK ? "localhost" : POSTGRESQL.getHost();
    }

    private static int postgresPort() {
        return HOST_NETWORK ? POSTGRES_PORT : POSTGRESQL.getMappedPort(POSTGRES_PORT);
    }

    private static String minioHost() {
        return HOST_NETWORK ? "localhost" : MINIO.getHost();
    }

    private static int minioPort() {
        return HOST_NETWORK ? MINIO_API_PORT : MINIO.getMappedPort(MINIO_API_PORT);
    }

    private static void awaitTcpService(String serviceName, Supplier<String> host, IntSupplier port) {
        long deadline = System.nanoTime() + SERVICE_STARTUP_TIMEOUT.toNanos();
        RuntimeException lastFailure = null;

        while (System.nanoTime() < deadline) {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(host.get(), port.getAsInt()), 500);
                return;
            } catch (Exception exception) {
                lastFailure = new IllegalStateException(serviceName + " is not reachable yet", exception);
                try {
                    Thread.sleep(200);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Interrupted while waiting for " + serviceName, interruptedException);
                }
            }
        }

        throw new IllegalStateException(serviceName + " did not become reachable within "
                + SERVICE_STARTUP_TIMEOUT.toSeconds() + " seconds", lastFailure);
    }
}
