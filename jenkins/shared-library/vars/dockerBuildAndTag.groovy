#!/usr/bin/env groovy

/**
 * Builds one service image and tags it.
 *
 * Exists because the pipeline builds three images that differ only in their
 * name and build context, and every one of them wants the same things: an
 * immutable tag from the commit, one or more moving tags, OCI provenance
 * labels, and a line in the log saying what came out. Repeating that three
 * times is where the three copies start to drift.
 *
 *   dockerBuildAndTag(
 *     name:     'msme-backend',      // image name (required)
 *     tag:      env.GIT_SHA,         // immutable tag (required)
 *     context:  'msme-backend',      // build context, defaults to `name`
 *     alsoTag:  ['dev'],             // extra moving tags
 *     registry: 'ghcr.io/acme',      // prefix, for a pushed image
 *   )
 *
 * Returns the fully qualified primary image reference, e.g.
 * "msme-backend:8f3c1d2" or "ghcr.io/acme/msme-backend:8f3c1d2".
 */
def call(Map args = [:]) {
  String name = requiredArg(args, 'name')
  String tag = requiredArg(args, 'tag')
  String context = args.get('context', name)
  String dockerfile = args.get('dockerfile', "${context}/Dockerfile")
  List alsoTag = (args.get('alsoTag', []) as List).findAll { it }
  String registry = args.get('registry', '')

  if (!fileExists(dockerfile)) {
    error("dockerBuildAndTag: no Dockerfile at '${dockerfile}'")
  }
  if (!fileExists(context)) {
    error("dockerBuildAndTag: build context '${context}' does not exist")
  }

  String repo = registry ? "${registry}/${name}" : name
  String primary = "${repo}:${tag}"

  // Every tag this build should answer to, primary first.
  List allTags = [tag] + alsoTag.findAll { it != tag }
  String tagFlags = allTags.collect { "--tag '${repo}:${it}'" }.join(' \\\n    ')

  echo "Building ${primary} (context: ${context}, also tagged: ${alsoTag ?: 'none'})"

  sh """
    set -eu
    docker build \\
    ${tagFlags} \\
      --file '${dockerfile}' \\
      --label 'org.opencontainers.image.revision=${tag}' \\
      --label 'org.opencontainers.image.source=${env.GIT_URL ?: ''}' \\
      --label 'org.opencontainers.image.version=${tag}' \\
      --label 'ci.jenkins.build=${env.BUILD_TAG ?: ''}' \\
      '${context}'
  """

  // Reported rather than assumed: an image that suddenly doubles in size is
  // usually a .dockerignore that stopped matching, and that is much easier to
  // notice in the build log than in a registry weeks later.
  String bytes = sh(
    script: "docker image inspect '${primary}' --format '{{.Size}}'",
    returnStdout: true
  ).trim()

  echo "Built ${primary} - ${(bytes as Long).intdiv(1024 * 1024)} MB, tags: ${allTags.join(', ')}"
  return primary
}

/** Fails the build with a useful message rather than a Groovy NPE later on. */
def requiredArg(Map args, String key) {
  def value = args.get(key)
  if (!value) {
    error("dockerBuildAndTag: '${key}' is required (got: ${value})")
  }
  return value.toString()
}
