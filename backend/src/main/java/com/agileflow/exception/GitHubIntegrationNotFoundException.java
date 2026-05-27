package com.agileflow.exception;

public class GitHubIntegrationNotFoundException extends RuntimeException {
    public GitHubIntegrationNotFoundException(String message) {
        super(message);
    }
}
