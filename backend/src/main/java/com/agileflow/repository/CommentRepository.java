package com.agileflow.repository;

import com.agileflow.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTask_IdOrderByCreatedAtAsc(Long taskId);
    List<Comment> findByTask_IdIn(Collection<Long> taskIds);
    void deleteByTask_IdIn(Collection<Long> taskIds);
    int countByTask_Id(Long taskId);
}
