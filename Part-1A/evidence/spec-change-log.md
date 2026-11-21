Spec Change Log: Part 1A (Loan EMI Calculator)

Location in repo: `Part-1A/evidence/spec-change-log.md`
Rule (assignment): a spec change is made in `spec.md` first, then plan/tasks/tests follow.



Specification Stability \& Defect Analysis

Neither spec.md nor .specify/memory/constitution.md was modified after commit c9ee4d3. The failure-and-repair cycle (failure1 → repair1, where 3 of 23 boundary tests failed and only src/validate.js was modified) was strictly an implementation defect, not a specification change. The requirements in spec.md (FR-002, FR-003, and AC-004) already defined the exact upper bounds and integer-only tenure rules; the agent simply violated them by parsing strings with Number(value) instead of exact decimal comparison.



Chronological Log Entries

14 Nov 2026 – 01:28 AM IST (c9ee4d3): I finalized spec.md, plan.md, and tasks.md after running /speckit.clarify and /speckit.analyze to eliminate ambiguities around rounding, error codes, and boundary inputs. Freezing spec.md at this commit established the single source of truth that governed all downstream tests and code generation.



14 Nov 2026 – 02:27 AM IST (328870d): I wrote the module skeletons and 20 acceptance tests directly from spec.md before generating any application code, updating tasks.md to reflect test-first completion. Keeping the spec untouched while translating each acceptance criterion into failing stub tests ensured the harness judged the code against the original requirements rather than agent assumptions.



14 Nov 2026 – 03:01 AM IST (aa45a3c → e4b866e): When manual CLI probing exposed that 50.0000000000000001, 480.0000000000000001, and 1.0000000000000001 bypassed validation, I verified spec.md and confirmed the specification was already exact—the bug came from IEEE-754 floating-point precision loss in Number() inside src/validate.js. Because the spec required no change, I only added three spec-derived boundary tests to tests/validate.test.js (aa45a3c) and restricted the agent's repair exclusively to src/validate.js (e4b866e).



22 Nov 2026 – 12:06 AM IST (44f248f): During my final review of Part-1A, I ticked off completed setup and review tasks (T001–T003 and T038) in tasks.md to match the committed evidence. I intentionally left T037 and T039 unticked because those optional hardening items (such as eliminating the two non-blocking regex lint warnings and adding stress-test input length caps) were deferred to the residual-risk section of the harness log rather than implemented post-freeze.

