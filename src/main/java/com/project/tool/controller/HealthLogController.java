package com.project.tool.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.project.tool.dto.HealthLogRequest;
import com.project.tool.entity.HealthLog;
import com.project.tool.mapper.HealthLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/health-logs")
@RequiredArgsConstructor
public class HealthLogController {

    private final HealthLogMapper healthLogMapper;

    /** 依日期由舊到新，方便前端畫趨勢圖 */
    @GetMapping
    public List<HealthLog> list() {
        return healthLogMapper.selectList(new LambdaQueryWrapper<HealthLog>()
                .orderByAsc(HealthLog::getLogDate));
    }

    /** 一天一筆：該日已有紀錄就更新，沒有就新增 */
    @PutMapping("/{date}")
    public HealthLog upsert(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                            @RequestBody HealthLogRequest req) {
        if (date.isAfter(LocalDate.now().plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能紀錄未來的日期");
        }
        String visit = text(req.visit(), 50, "就診");
        String exercise = text(req.exercise(), 500, "運動內容");
        String treatment = text(req.treatment(), 500, "治療 / 用藥");
        String note = req.note() == null ? "" : req.note();
        if (note.length() > 20000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "心得最多 20000 字");
        int minutes = req.exerciseMinutes() == null ? 0 : req.exerciseMinutes();
        if (minutes < 0 || minutes > 1440) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "運動分鐘數不正確");

        HealthLog log = healthLogMapper.selectOne(new LambdaQueryWrapper<HealthLog>()
                .eq(HealthLog::getLogDate, date));
        LocalDateTime now = LocalDateTime.now();
        boolean isNew = log == null;
        if (isNew) {
            log = new HealthLog();
            log.setLogDate(date);
            log.setCreatedAt(now);
        }
        log.setPainLevel(score(req.painLevel(), "疼痛程度"));
        log.setMobility(score(req.mobility(), "活動度"));
        log.setVisit(visit);
        log.setExercise(exercise);
        log.setExerciseMinutes(minutes);
        log.setTreatment(treatment);
        log.setNote(note);
        log.setUpdatedAt(now);
        if (isNew) healthLogMapper.insert(log);
        else healthLogMapper.updateById(log);
        return log;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        healthLogMapper.deleteById(id);
    }

    private static String text(String value, int max, String name) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + "最多 " + max + " 字");
        return trimmed;
    }

    /** 0~10，可不填（null） */
    private static Integer score(Integer value, String name) {
        if (value == null) return null;
        if (value < 0 || value > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + "需介於 0~10");
        }
        return value;
    }
}
