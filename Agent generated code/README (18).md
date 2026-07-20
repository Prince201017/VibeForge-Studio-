# Advanced AI Engine [Claude.A14]

Built from INDEX.md bullet only ("Style transfer, code gen, NLP, 4000-5000 LOC") —
real `15_ADVANCED_AI_ENGINE_NEEDS.md` not provided.

## Included
- `nlp_command_parser.py` — parses natural-language editor commands ("make it bigger
  and move it right") into structured `ParsedCommand` objects, LLM-client injected
  for testability
- `style_transfer.py` — **rule-based** style extraction/application (dominant colors,
  corner radius, fonts, spacing scale). **Actually unit-tested and passing.**
- `code_gen_assist.py` — component-level generation (buttons/cards/forms), reuses
  04-ai-integration's node schema

## Honest limitation
"Style transfer" in ML usually implies a trained neural model (e.g. CNN-based feature
transfer). That needs a model artifact, training data, and inference infra nowhere
specified in the index — so this delivers a statistical/rule-based style-profile
extractor instead, which is real, testable, and solves the same practical problem
("make these nodes match that project's look") without inventing a fake model.
