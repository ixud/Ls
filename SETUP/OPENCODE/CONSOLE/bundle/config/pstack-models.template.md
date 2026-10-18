# pstack model configuration (template)

Copy this file to `~/.agents/pstack-models.md` and adjust the values to the models your OpenCode providers actually expose. Every pstack skill reads it at task start. Delete a line to fall back to the skill default. `/setup-pstack` writes this file for you and keeps re-runs idempotent.

`inherit-parent` or `auto` as a value: the role runs on the parent chat model. Alias entries in a panel list still count toward its fan-out.

OpenCode note: the `task` tool takes no per-spawn `model`. Role lines guide the tier and model choice the parent writes into each brief, and record the intended model for delegates. Name the intended model in the brief and record which model actually ran when it matters.

```
# budget: large (xhigh)
feature, refactoring: grok-4.7-xhigh-fast
bug-fix: grok-4.7-xhigh-fast
perf-issue: grok-4.7-xhigh-fast
hillclimb: grok-4.7-xhigh-fast
judgment and prose: claude-opus-5-5-xhigh
hardest tasks: claude-opus-5-5-xhigh
how explorer: grok-4.7-xhigh-fast
how explainer: claude-opus-5-5-xhigh
why investigators: grok-4.7-xhigh-fast
why synthesizer: claude-opus-5-5-xhigh
reflect tooling: grok-4.7-xhigh-fast
reflect judgment, divergent, synthesizer: claude-opus-5-5-xhigh
arena runners: claude-opus-5-5-xhigh, grok-4.7-xhigh-fast
arena cross-judge pool: claude-opus-5-5-xhigh, grok-4.7-xhigh-fast
swarm workers: grok-4.7-xhigh-fast
architect runners: claude-opus-5-5-xhigh, grok-4.7-xhigh-fast
interrogate reviewers: claude-opus-5-5-xhigh, grok-4.7-xhigh-fast
```

The budget labels: `unlimited — max`, `large — xhigh` (skill defaults), `medium — high`, `small — medium`. The effort token is the last token, or the one before a trailing `fast`, on the ladder `max` > `xhigh` > `high` > `medium` > `low`.
