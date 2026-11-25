# Stage 1: Build the Spring Boot application
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy Maven configuration first for better build caching
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline

# Copy application source code
COPY src/ ./src/

# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Production runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create a non-root user
RUN addgroup -S spring && adduser -S spring -G spring

# Copy the generated JAR
COPY --from=builder --chown=spring:spring \
    /app/target/order-service.jar ./order-service.jar

USER spring

EXPOSE 8082

#HEALTHCHECK
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8082/health || exit 1

ENTRYPOINT ["java", "-jar", "order-service.jar"]
