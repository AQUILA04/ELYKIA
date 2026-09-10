package com.optimize.elykia.core.notificationhub;

/**
 * Exception HTTP / transport lors d'un appel au Notification Hub.
 */
public class NotificationHubClientException extends RuntimeException {

    private final Integer statusCode;
    private final String responseBody;

    public NotificationHubClientException(String message) {
        this(message, null, null, null);
    }

    public NotificationHubClientException(String message, int statusCode) {
        this(message, Integer.valueOf(statusCode), null, null);
    }

    public NotificationHubClientException(String message, int statusCode, String responseBody) {
        this(message, Integer.valueOf(statusCode), responseBody, null);
    }

    public NotificationHubClientException(String message, Throwable cause) {
        this(message, null, null, cause);
    }

    private NotificationHubClientException(
            String message, Integer statusCode, String responseBody, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }
}
