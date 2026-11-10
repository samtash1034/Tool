package com.project.tool.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.project.tool.dto.NoteRequest;
import com.project.tool.entity.Note;
import com.project.tool.mapper.NoteMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteMapper noteMapper;

    /** 依更新時間排序（最新在前） */
    @GetMapping
    public List<Note> list() {
        return noteMapper.selectList(new LambdaQueryWrapper<Note>()
                .orderByDesc(Note::getUpdatedAt)
                .orderByDesc(Note::getId));
    }

    @PostMapping
    public Note create() {
        LocalDateTime now = LocalDateTime.now();
        Note note = new Note();
        note.setTitle("");
        note.setContent("");
        note.setCreatedAt(now);
        note.setUpdatedAt(now);
        noteMapper.insert(note);
        return note;
    }

    @PutMapping("/{id}")
    public Note update(@PathVariable Long id, @RequestBody NoteRequest req) {
        Note note = noteMapper.selectById(id);
        if (note == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這篇記事");
        String title = req.title() == null ? "" : req.title();
        if (title.length() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "標題最多 200 字");
        note.setTitle(title);
        note.setContent(req.content() == null ? "" : req.content());
        note.setUpdatedAt(LocalDateTime.now());
        noteMapper.updateById(note);
        return note;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        noteMapper.deleteById(id);
    }
}
