from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
import heapq
import itertools
import logging
from typing import List, Dict, Optional, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")

_id_counter = itertools.count(1)


@dataclass
class Task:
    id: int
    name: str
    duration_minutes: int
    category: str = "general"
    urgency: float = 0.0
    importance: float = 0.0
    enjoyment: float = 0.0
    earliest_start: Optional[datetime] = None
    latest_finish: Optional[datetime] = None
    constraints: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self):
        d = asdict(self)
        for k in ("earliest_start", "latest_finish"):
            if d[k]:
                d[k] = d[k].isoformat()
        return d


@dataclass
class ScheduledEvent:
    task_id: int
    task_name: str
    start: datetime
    end: datetime

    def to_dict(self):
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "duration_minutes": int((self.end - self.start).total_seconds() // 60),
        }


class SchedulerState:
    def __init__(self):
        self.tasks: Dict[int, Task] = {}
        self.scheduled: List[ScheduledEvent] = []
        self.timezone_offset_minutes = 0

    def clear(self):
        self.tasks.clear()
        self.scheduled.clear()


state = SchedulerState()


def _normalize(value: float, minv: float = 0.0, maxv: float = 1.0) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0.0
    if v < minv:
        return minv
    if v > maxv:
        return maxv
    return (v - minv) / (maxv - minv) if maxv > minv else 0.0


def score_task(task: Task, now: Optional[datetime] = None) -> float:
    now = now or datetime.now()
    u = _normalize(task.urgency)
    imp = _normalize(task.importance)
    enjoy = _normalize(task.enjoyment)

    weight_urgency = 0.5
    weight_importance = 0.35
    weight_enjoyment = 0.15
    base = (weight_urgency * u) + (weight_importance * imp) + (weight_enjoyment * enjoy)

    deadline_boost = 0.0
    if task.latest_finish:
        try:
            secs_left = (task.latest_finish - now).total_seconds()
            if secs_left <= 0:
                deadline_boost = 1.0
            else:
                days_left = max(secs_left / 86400.0, 0.0001)
                deadline_boost = min(1.0, 1.0 / (days_left + 0.1))
        except Exception:
            deadline_boost = 0.0

    constraint_penalty = 0.0
    if task.constraints.get("requires_equipment"):
        constraint_penalty += 0.1
    if task.constraints.get("needs_quiet"):
        constraint_penalty += 0.05

    score = base + 0.5 * deadline_boost - constraint_penalty
    return max(score, 0.0)


def add_task(
    name: str,
    duration_minutes: int,
    category: str = "general",
    urgency: float = 0.0,
    importance: float = 0.0,
    enjoyment: float = 0.0,
    earliest_start: Optional[str] = None,
    latest_finish: Optional[str] = None,
    constraints: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    tid = next(_id_counter)
    es = None
    lf = None
    try:
        if earliest_start:
            es = datetime.fromisoformat(earliest_start)
    except Exception:
        logger.debug("Could not parse earliest_start", exc_info=True)
    try:
        if latest_finish:
            lf = datetime.fromisoformat(latest_finish)
    except Exception:
        logger.debug("Could not parse latest_finish", exc_info=True)

    task = Task(
        id=tid,
        name=name,
        duration_minutes=int(max(1, duration_minutes)),
        category=category,
        urgency=float(urgency),
        importance=float(importance),
        enjoyment=float(enjoyment),
        earliest_start=es,
        latest_finish=lf,
        constraints=constraints or {},
        metadata=metadata or {},
    )
    state.tasks[tid] = task
    logger.info("Added task %s (id=%d)", name, tid)
    return {"status": "ok", "task": task.to_dict()}


def remove_task(task_id: int) -> Dict[str, Any]:
    if task_id in state.tasks:
        del state.tasks[task_id]
        logger.info("Removed task id=%s", task_id)
        state.scheduled = [s for s in state.scheduled if s.task_id != task_id]
        return {"status": "ok", "removed_id": task_id}
    return {"status": "error", "message": "task not found", "task_id": task_id}


def rank_tasks(now: Optional[datetime] = None) -> List[Dict[str, Any]]:
    now = now or datetime.now()
    heap = []
    for t in state.tasks.values():
        s = score_task(t, now=now)
        heapq.heappush(heap, (-s, t.id, t))
    ranked = []
    while heap:
        negs, tid, task = heapq.heappop(heap)
        ranked.append({"task": task.to_dict(), "score": -negs})
    return ranked


def schedule_day(
    day_start: datetime,
    day_end: datetime,
    max_chunk_minutes: Optional[int] = None,
    now: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    now = now or datetime.now()

    if day_end <= day_start:
        raise ValueError("day_end must be after day_start")

    state.scheduled = []

    ranked = rank_tasks(now=now)
    tasks_in_order = [state.tasks[r["task"]["id"]] for r in ranked if r["task"]["id"] in state.tasks]

    cursor = day_start

    for task in tasks_in_order:
        if task.earliest_start and cursor < task.earliest_start:
            cursor = max(cursor, task.earliest_start)

        available_until = day_end
        if task.latest_finish and task.latest_finish < available_until:
            available_until = task.latest_finish

        remaining_minutes = task.duration_minutes
        chunk = max(remaining_minutes, max_chunk_minutes or remaining_minutes)
        if max_chunk_minutes:
            chunk = min(max_chunk_minutes, remaining_minutes)

        while remaining_minutes > 0 and cursor < available_until:
            slot_minutes = min(remaining_minutes, (available_until - cursor).total_seconds() // 60)
            if max_chunk_minutes:
                slot_minutes = min(slot_minutes, max_chunk_minutes)

            if slot_minutes <= 0:
                break

            start = cursor
            end = start + timedelta(minutes=int(slot_minutes))

            ev = ScheduledEvent(task_id=task.id, task_name=task.name, start=start, end=end)
            state.scheduled.append(ev)

            logger.debug("Scheduled task %s from %s to %s", task.name, start, end)

            cursor = end
            remaining_minutes -= slot_minutes

        if cursor >= day_end:
            break

    return [ev.to_dict() for ev in state.scheduled]


def export_schedule_json() -> Dict[str, Any]:
    return {
        "created_at": datetime.now().isoformat(),
        "tasks": [t.to_dict() for t in state.tasks.values()],
        "scheduled": [s.to_dict() for s in state.scheduled],
    }


def get_tasks_summary() -> Dict[str, Any]:
    return {"count": len(state.tasks), "tasks": [t.to_dict() for t in state.tasks.values()]}
