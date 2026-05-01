FROM eclipse-temurin:17-jre-alpine

# Create a dedicated non-root user with a proper home directory
RUN addgroup -S app && adduser -S app -G app -h /home/app

WORKDIR /app

COPY target/optimize-elykia-core-*.jar app.jar

# Create the required directories and give ownership to the app user
RUN mkdir -p /home/app/.optimize-elykia-core/logs \
    && mkdir -p /home/app/.optimize-elykia-core/operations \
    && chown -R app:app /home/app \
    && chown -R app:app /app

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
