# Discussion

The OX Break Glass Bot is a demonstration sample Slack application for the purpose of satisfying customer use case POVs. Its purpose is to allow developers to "break glass" and push through a build, even though there are OX Blocking issues. It is unsupported and provided as an example.

Maintenance of the application will include vulnerability identification & resolution tracked within this file.

### Maintenance Log

#### 2024/05/30

* OX Finding: `Object keys order is not guaranteed in JSON.stringify`
Resolution: The order does not apply to OX's Exclusion API, so this info level finding is being ignored.
* OX Finding: `Private repo can be forked`
Resolution: This repo will be public and as such, ignoring this medium level finding.
* no other issues at this time
