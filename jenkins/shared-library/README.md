# `msme-shared`

The Jenkins shared library for this repository. Configured in Jenkins as a
**Global Pipeline Library** named `msme-shared` with **Library Path**
`jenkins/shared-library` — see [`../README.md`](../README.md) step 3.

```
shared-library/
└── vars/
    ├── dockerBuildAndTag.groovy   the step
    └── dockerBuildAndTag.txt      its help text, shown in Pipeline Syntax
```

It lives in the application repository rather than one of its own so that a
change to the pipeline and a change to the step it calls arrive in the same
commit and the same review.

## `dockerBuildAndTag`

Builds one service image, tags it with an immutable commit tag plus any moving
tags, and attaches OCI provenance labels.

```groovy
def image = dockerBuildAndTag(
  name:     'msme-backend',   // required - image name
  tag:      env.GIT_SHA,      // required - immutable tag
  context:  'msme-backend',   // optional - defaults to `name`
  alsoTag:  ['dev'],          // optional - extra moving tags
  registry: 'ghcr.io/acme',   // optional - prefix for a pushed image
)
// -> "msme-backend:8f3c1d2"
```

It exists because the pipeline builds three images that differ only in name and
build context, while every one of them wants the same things: the SHA tag, the
moving tag the overlay pins, `org.opencontainers.image.*` labels tying the image
back to a commit, and a log line saying what came out and how big it was.
Written out three times, those three copies are where the drift starts.

The size is echoed on purpose. An image that suddenly doubles is nearly always
a `.dockerignore` that stopped matching, and that is far easier to catch in a
build log than in a registry three weeks later.

### Adding a step

One file per step in `vars/`, named after the step, exposing `def call(...)`.
Add a matching `.txt` alongside it and Jenkins will show it under
**Pipeline Syntax → Global Variables Reference**.
