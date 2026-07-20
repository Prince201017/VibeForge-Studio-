from operations import Operation, OpType, transform, apply_operation


def test_concurrent_set_property_last_write_wins():
    op_a = Operation(op_id="1", actor_id="alice", timestamp=1.0, type=OpType.SET_PROPERTY,
                      node_id="n1", property="x", value=10, prev_value=0)
    op_b = Operation(op_id="2", actor_id="bob", timestamp=2.0, type=OpType.SET_PROPERTY,
                      node_id="n1", property="x", value=20, prev_value=0)
    result = transform(op_a, op_b)
    assert result.value == 0  # op_a superseded, becomes no-op reverting to prev_value


def test_delete_wins_over_concurrent_edit():
    delete_op = Operation(op_id="1", actor_id="alice", timestamp=1.0, type=OpType.DELETE_NODE, node_id="n1")
    edit_op = Operation(op_id="2", actor_id="bob", timestamp=1.5, type=OpType.SET_PROPERTY, node_id="n1", property="x", value=5)
    result = transform(delete_op, edit_op)
    assert result.type == OpType.DELETE_NODE


def test_apply_operation_sets_property():
    scene = {"nodes": {"n1": {"x": 0}}}
    op = Operation(op_id="1", actor_id="a", timestamp=1.0, type=OpType.SET_PROPERTY, node_id="n1", property="x", value=99)
    result = apply_operation(scene, op)
    assert result["nodes"]["n1"]["x"] == 99
