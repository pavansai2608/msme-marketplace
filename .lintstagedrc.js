const path = require('path')

// lint-staged hands over ABSOLUTE paths and runs from the repo root, but each
// workspace has its own flat ESLint config (and its own ESLint major version).
// The tools therefore have to run with their CWD *inside* the workspace.
//
// `npm --prefix <dir> exec -- eslint` does NOT do that: --prefix only redirects
// package resolution, so the child still runs in the repo root and cannot
// resolve workspace-relative paths like "controllers/checkoutController.js".
// Wrapping in `bash -c "cd <dir> && ..."` actually changes the directory.
//
// The workspace-local binaries are called directly rather than through npx, so
// each workspace gets its own ESLint version with no resolution surprises.
const inWorkspace = (workspace) => (filenames) => {
  const dir = path.join(__dirname, workspace)
  const rel = filenames.map((file) => `'${path.relative(dir, file)}'`).join(' ')

  const run = (bin, args) =>
    `bash -c "cd '${workspace}' && node_modules/.bin/${bin} ${args} ${rel}"`

  return [run('eslint', '--fix'), run('prettier', '--write')]
}

module.exports = {
  'msme-backend/**/*.js': inWorkspace('msme-backend'),
  'msme-frontend/**/*.{js,jsx}': inWorkspace('msme-frontend'),
}
