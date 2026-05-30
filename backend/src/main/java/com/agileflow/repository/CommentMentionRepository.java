package com.agileflow.repository;

import com.agileflow.entity.CommentMention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface CommentMentionRepository extends JpaRepository<CommentMention, Long> {
    @Modifying
    @Query("DELETE FROM CommentMention mention WHERE mention.comment.task.id IN :taskIds")
    void deleteByCommentTaskIds(@Param("taskIds") Collection<Long> taskIds);
}
