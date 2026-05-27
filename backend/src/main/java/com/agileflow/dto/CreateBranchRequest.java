package com.agileflow.dto;

public record CreateBranchRequest(
        String branchName,
        String fromBranch
) {
}
