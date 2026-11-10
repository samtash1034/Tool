package com.project.tool.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.project.tool.dto.TodoOrderItem;
import com.project.tool.dto.TodoRequest;
import com.project.tool.entity.Todo;
import com.project.tool.mapper.TodoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private static final Set<String> LEVELS = Set.of("high", "normal", "low", "work", "daily");
    private static final String DEFAULT_LEVEL = "normal";

    private final TodoMapper todoMapper;

    @GetMapping
    public List<Todo> list() {
        return todoMapper.selectList(new LambdaQueryWrapper<Todo>()
                .orderByAsc(Todo::getSortOrder)
                .orderByDesc(Todo::getId));
    }

    /** 新增的待辦放在最前面 */
    @PostMapping
    public Todo create(@RequestBody TodoRequest req) {
        String text = requireText(req.text());
        Todo first = todoMapper.selectOne(new LambdaQueryWrapper<Todo>()
                .orderByAsc(Todo::getSortOrder).last("LIMIT 1"));

        Todo todo = new Todo();
        todo.setText(text);
        todo.setLevel(LEVELS.contains(req.level()) ? req.level() : DEFAULT_LEVEL);
        todo.setSortOrder(first == null ? 0 : first.getSortOrder() - 1);
        todo.setCreatedAt(LocalDateTime.now());
        todoMapper.insert(todo);
        return todo;
    }

    @PatchMapping("/{id}")
    public Todo updateText(@PathVariable Long id, @RequestBody TodoRequest req) {
        Todo todo = findOrThrow(id);
        todo.setText(requireText(req.text()));
        todoMapper.updateById(todo);
        return todo;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        todoMapper.deleteById(id);
    }

    /** 拖曳搬移後，前端送上完整順序；依陣列索引重寫 sort_order 與 level */
    @PutMapping("/order")
    @Transactional
    public void reorder(@RequestBody List<TodoOrderItem> items) {
        for (int i = 0; i < items.size(); i++) {
            TodoOrderItem item = items.get(i);
            if (item.id() == null || !LEVELS.contains(item.level())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "排序資料不正確");
            }
            Todo patch = new Todo();
            patch.setId(item.id());
            patch.setLevel(item.level());
            patch.setSortOrder(i);
            todoMapper.updateById(patch);
        }
    }

    private Todo findOrThrow(Long id) {
        Todo todo = todoMapper.selectById(id);
        if (todo == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這筆待辦");
        return todo;
    }

    private static String requireText(String text) {
        String trimmed = text == null ? "" : text.trim();
        if (trimmed.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "內容不可為空");
        if (trimmed.length() > 500) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "內容最多 500 字");
        return trimmed;
    }
}
