from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import logging
import scheduler

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@app.route("/", methods=["GET"])
def index():
    s = scheduler.export_schedule_json()
    html = "<h1>Scheduler API</h1>"
    html += f"<p>Tasks: {len(s['tasks'])}</p>"
    html += "<p>Use the REST endpoints to add tasks and request schedules.</p>"
    html += "<ul><li>POST /add_task</li><li>POST /schedule</li><li>GET /schedule</li></ul>"
    return html


@app.route("/add_task", methods=["POST"])
def add_task_route():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"status": "error", "message": "invalid or missing JSON body"}), 400
    try:
        resp = scheduler.add_task(
            name=payload.get("name", "Untitled Task"),
            duration_minutes=int(payload.get("duration_minutes", 30)),
            category=payload.get("category", "general"),
            urgency=float(payload.get("urgency", 0.0)),
            importance=float(payload.get("importance", 0.0)),
            enjoyment=float(payload.get("enjoyment", 0.0)),
            earliest_start=payload.get("earliest_start"),
            latest_finish=payload.get("latest_finish"),
            constraints=payload.get("constraints", {}),
            metadata=payload.get("metadata", {}),
        )
        return jsonify(resp)
    except Exception as e:
        logger.exception("Error adding task")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/task/<int:task_id>", methods=["DELETE"])
def delete_task_route(task_id):
    resp = scheduler.remove_task(task_id)
    if resp.get("status") == "ok":
        return jsonify(resp)
    return jsonify(resp), 404


@app.route("/tasks", methods=["GET"])
def list_tasks():
    return jsonify(scheduler.get_tasks_summary())


@app.route("/schedule", methods=["POST"])
def schedule_route():
    payload = request.get_json(silent=True) or {}
    try:
        ds = payload.get("day_start")
        de = payload.get("day_end")
        chunk = payload.get("max_chunk_minutes")
        if ds and de:
            day_start = datetime.fromisoformat(ds)
            day_end = datetime.fromisoformat(de)
        else:
            now = datetime.now()
            day_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
            day_end = day_start.replace(hour=17)
        scheduler.schedule_day(day_start, day_end, max_chunk_minutes=chunk)
        return jsonify({"status": "ok", "scheduled": scheduler.export_schedule_json()["scheduled"]})
    except Exception as e:
        logger.exception("Error scheduling")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/schedule", methods=["GET"])
def get_schedule():
    return jsonify(scheduler.export_schedule_json())


@app.route("/clear", methods=["POST"])
def clear_state_route():
    scheduler.state.clear()
    return jsonify({"status": "ok", "message": "state cleared"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=False)
