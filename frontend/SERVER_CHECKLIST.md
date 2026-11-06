# Backend integration checklist

This is outstanding work, not verified production state. Earlier notes described
a separate server with changes that were not necessarily committed to backend main.

- [ ] Implement and test `/barriers`, `/greenwashing`, and `/sentiment`.
- [ ] Implement persistent report jobs if durable background processing is needed.
- [ ] Expose model metadata and evaluation provenance through an API.
- [ ] Replace illustrative examples with recorded outputs, or label them as demonstrations.
- [ ] Align threshold/confidence explanations with the selected model bundle.
- [ ] Supply the `audience-x90` artifact and compatible dependencies.
- [ ] Define application authentication, quotas, and deployment timeouts.
- [ ] Verify the whole workflow against the exact deployed backend revision.

See [the overview](../docs/PROJECT_OVERVIEW.md) and [runbook](../docs/RUNNING.md).
