# First Class Jobs Pattern

Background work (LLM calls, image generation, imports) is often presented to users as a visible, trackable thing, like a download in a browser or a print job. To support this, each job is stored as a record in the application's own database, separate from the job queue system (e.g. Bull) that actually executes it.

The two hold different things. The queue tracks *execution attempts*: short-lived, infrastructure-level state. The database record tracks the *request*: what was asked for, how far along it is, and what came out of it. It is permanent and can be joined to the rest of the application's data.

## Pattern Overview

1. **Job Creation**: A job record is inserted into the database (status `queued`) and the job is scheduled on the queue, referencing the record's ID. The record is returned to the client immediately so it appears in the UI straight away.
2. **Job Processing Start**: When the queue picks up the job, the record's status is set to `running`.
3. **Progress Updates**: As the job progresses, a progress value (e.g. 3 of 10) is written to the record.
4. **Retries**: When an attempt fails, the error must still propagate to the queue so it can retry. The record is marked `retrying`, not `failed`. A job is only `failed` once the queue has used up its retries.
5. **Job Completion**: The record ends in `succeeded` (with its result) or `failed` (with its last error).
6. **User Interface**: The application reads job state exclusively from the database, never from the queue system (e.g. Redis).

## Guidelines

- **Sync state in one place.** Status transitions should be driven by queue-level lifecycle events (started, completed, failed), not written by hand inside each job handler. Handlers do the work, report progress and return a result.
- **Make jobs idempotent.** A retry reruns the job from the start. For expensive work, save partial results as they are produced and skip completed steps on retry.
- **Keep records after completion.** Finished jobs serve as history and help with debugging failures.

Because the UI depends only on the database record, the queue implementation can be swapped without affecting the rest of the application.