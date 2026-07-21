"""[CollabAgent] test_sync_engine.py — integration tests for multi-user
operation submission, conflict surfacing, and undo."""
import time
from uuid import uuid4

import pytest

from models.operation import Operation, OperationType
from services.sync_engine import SyncEngine


def make_op(project_id, user_id, **overrides) -> Operation:
    defaults = dict(
        project_id=project_id,
        operation_id=0,  # server assigns
        user_id=user_id,
        type=OperationType.MODIFY,
        layer_id=uuid4(),
        path="fill.color",
        value="#FF0000",
        old_value="#000000",
        timestamp=0,
        lamport_time=0,
        parent_op_id=0,
        site_id=str(user_id),
    )
    defaults.update(overrides)
    return Operation(**defaults)


@pytest.mark.asyncio
async def test_sequential_ops_get_increasing_ids():
    engine = SyncEngine()
    project_id = uuid4()
    user = uuid4()
    op1, ack1 = await engine.submit_operation(project_id, make_op(project_id, user))
    op2, ack2 = await engine.submit_operation(project_id, make_op(project_id, user, parent_op_id=op1.operation_id))
    assert op2.operation_id == op1.operation_id + 1
    assert ack1.accepted and ack2.accepted


@pytest.mark.asyncio
async def test_concurrent_edit_on_same_layer_surfaces_conflict():
    engine = SyncEngine()
    project_id = uuid4()
    user_a, user_b = uuid4(), uuid4()
    layer_id = uuid4()

    conflicts_seen = []
    engine.on_conflict = lambda pid, op: conflicts_seen.append(op)

    op_a = make_op(project_id, user_a, layer_id=layer_id, lamport_time=5, site_id="a")
    final_a, _ = await engine.submit_operation(project_id, op_a)

    # user_b didn't know about A's change yet (parent_op_id = 0)
    op_b = make_op(project_id, user_b, layer_id=layer_id, lamport_time=3, site_id="b", parent_op_id=0)
    final_b, ack_b = await engine.submit_operation(project_id, op_b)

    assert len(conflicts_seen) == 1
    assert ack_b.accepted is False  # B's lower lamport time lost


@pytest.mark.asyncio
async def test_undo_generates_inverse_operation():
    engine = SyncEngine()
    project_id = uuid4()
    user = uuid4()
    op = make_op(project_id, user, value="red", old_value="blue")
    applied, _ = await engine.submit_operation(project_id, op)

    inverse = await engine.undo(project_id, user)
    assert inverse is not None
    assert inverse.value == "blue"
    assert inverse.old_value == "red"


@pytest.mark.asyncio
async def test_rate_limit_enforced():
    engine = SyncEngine()
    engine.RATE_LIMIT_OPS_PER_MINUTE = 3
    project_id = uuid4()
    user = uuid4()
    for _ in range(3):
        await engine.submit_operation(project_id, make_op(project_id, user))
    with pytest.raises(RuntimeError):
        await engine.submit_operation(project_id, make_op(project_id, user))


@pytest.mark.asyncio
async def test_reconnection_recovers_missed_ops():
    engine = SyncEngine()
    project_id = uuid4()
    user = uuid4()
    for _ in range(5):
        await engine.submit_operation(project_id, make_op(project_id, user))
    batch = await engine.recover_since(project_id, since_operation_id=2)
    assert len(batch.operations) == 3
    assert batch.latest_operation_id == 5
