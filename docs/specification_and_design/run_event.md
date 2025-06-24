# specification and design

## specification

- Can be executed on any event
- Incomplete jobs output warning logs and are skipped

## design

- Considered having the Workflow model hold events to enable event-specific
  behavior, but decided against it since we could comprehensively support
  various events
- Ensure backward compatibility
