package com.agileflow.exception;

public class GitHubRepositoryNotFoundException extends RuntimeException {
    public GitHubRepositoryNotFoundException(String message) {
        super(message);
    }
}
