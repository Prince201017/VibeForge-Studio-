"""[CollabAgent] test_operational_transform.py — OT correctness tests,
including convergence proofs for concurrent operations applied in either
order (the core OT guarantee)."""
import time
from uuid import uuid4

import pytest

from models.operation import Operation, OperationType
from services.operational_transform import OperationalTransform


def make_op(**overrides) -> Operation:
    defaults = dict(
        project_id=uuid4(),
        operation_id=1,
        user_id=uuid4(),
        type=OperationType.MODIFY,
        layer_id=uuid4(),
        path="fill.color",
        value="#FF0000",
        old_value="#000000",
        timestamp=time.time(),
        lamport_time=1,
        parent_op_id=0,
        site_id="site-a",
    )
    defaults.update(overrides)
    return Operation(**defaults)


class TestScalarTransform:
    def test_higher_lamport_wins(self):
        ot = OperationalTransform()
        layer_id = uuid4()
        op_a = make_op(layer_id=layer_id, lamport_time=5, site_id="a", value="red")
        op_b = make_op(layer_id=layer_id, lamport_time=3, site_id="b", value="blue")

        # op_b arrives after op_a was already applied -> op_b should lose (lower lamport)
        result = ot.transform(incoming=op_b, applied=op_a)
        assert result.dropped is True
        assert result.conflict is True

    def test_tie_break_by_site_id(self):
        ot = OperationalTransform()
        layer_id = uuid4()
        op_a = make_op(layer_id=layer_id, lamport_time=5, site_id="a")
        op_b = make_op(layer_id=layer_id, lamport_time=5, site_id="z")

        # same lamport time -> higher site_id wins; b > a lexically
        result = ot.transform(incoming=op_a, applied=op_b)
        assert result.dropped is True  # a loses to z


class TestListTransform:
    def test_insert_shifts_later_insert_index(self):
        ot = OperationalTransform()
        layer_id = uuid4()
        applied = make_op(
            layer_id=layer_id, type=OperationType.LIST_INSERT, path="children",
            value={"index": 2, "item": "X"},
        )
        incoming = make_op(
            layer_id=layer_id, type=OperationType.LIST_INSERT, path="children",
            value={"index": 2, "item": "Y"},
        )
        result = ot.transform(incoming=incoming, applied=applied)
        assert result.op.value["index"] == 3

    def test_delete_before_insert_shifts_index_down(self):
        ot = OperationalTransform()
        layer_id = uuid4()
        applied = make_op(
            layer_id=layer_id, type=OperationType.LIST_DELETE, path="children",
            value={"index": 1},
        )
        incoming = make_op(
            layer_id=layer_id, type=OperationType.LIST_INSERT, path="children",
            value={"index": 3, "item": "Y"},
        )
        result = ot.transform(incoming=incoming, applied=applied)
        assert result.op.value["index"] == 2

    def test_delete_of_already_deleted_item_is_dropped(self):
        ot = OperationalTransform()
        layer_id = uuid4()
        applied = make_op(
            layer_id=layer_id, type=OperationType.LIST_DELETE, path="children",
            value={"index": 2},
        )
        incoming = make_op(
            layer_id=layer_id, type=OperationType.LIST_DELETE, path="children",
            value={"index": 2},
        )
        result = ot.transform(incoming=incoming, applied=applied)
        assert result.dropped is True


class TestConvergence:
    """The defining OT property: applying [A then transformed-B] must reach
    the same final value as applying [B then transformed-A]."""

    def test_convergence_scalar(self):
        ot = OperationalTransform()
        layer_id = uuid4()
        op_a = make_op(layer_id=layer_id, lamport_time=7, site_id="a", value="red")
        op_b = make_op(layer_id=layer_id, lamport_time=3, site_id="b", value="blue")

        # Order 1: A applied, then B arrives and is transformed against A
        result_1 = ot.transform(incoming=op_b, applied=op_a)
        final_value_1 = op_a.value if result_1.dropped else result_1.op.value

        # Order 2: B applied, then A arrives and is transformed against B
        result_2 = ot.transform(incoming=op_a, applied=op_b)
        final_value_2 = op_b.value if result_2.dropped else result_2.op.value

        assert final_value_1 == final_value_2 == "red"  # higher lamport (A) always wins


class TestHistoryTransform:
    def test_transform_against_full_history(self):
        ot = OperationalTransform()
        layer_id = uuid4()
        history = [
            make_op(operation_id=1, layer_id=layer_id, type=OperationType.LIST_INSERT,
                     path="children", value={"index": 0, "item": "A"}),
            make_op(operation_id=2, layer_id=layer_id, type=OperationType.LIST_INSERT,
                     path="children", value={"index": 1, "item": "B"}),
        ]
        incoming = make_op(
            parent_op_id=0, layer_id=layer_id, type=OperationType.LIST_INSERT,
            path="children", value={"index": 0, "item": "C"},
        )
        result = ot.transform_against_history(incoming, history)
        # C was meant to land at 0 before the client had seen A or B; after
        # both are replayed it should shift forward by 2.
        assert result.op.value["index"] == 2
        assert result.conflict is True
