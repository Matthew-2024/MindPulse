# Minimal Check-in and Dual Threshold Policy

## One Question at a Time

- The prompt ranks missing signals using current data completeness, safety uncertainty, available baseline samples, and a stable signal order.
- Mood and sleep receive the highest safety value; connection is next; activity can be deferred.
- The page shows one highest-value prompt, explains why it is requested, and always offers a skip action that advances to the next missing signal.
- Additional fields remain optional user-initiated detail, not requirements for saving a record.

## Threshold Precedence

1. Crisis text and active safety hold restrict ordinary action and route to Help.
2. Absolute sleep at or below 4.5 hours, or three recent negative states, produces medium attention even before a baseline is ready.
3. Two or more deviations from a ready real-trial personal baseline produce medium attention.
4. Insufficient data asks for another record only when no higher-priority threshold is active.
5. Synthetic demo records retain their fixed demonstration path and do not create a personal-baseline escalation.

## Report Semantics

- Reports aggregate by local natural day, not a rolling 24-hour window.
- Every seven-day view reserves seven date-labelled slots.
- Missing values remain `missing`; they are never converted to zero bars or included in averages.
