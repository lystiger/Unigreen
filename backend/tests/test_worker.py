from unigreen.worker.tasks import heartbeat


def test_worker_heartbeat() -> None:
    assert heartbeat.fn() == "ok"
