module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0], // allow any case in the subject
    'body-max-line-length': [1, 'always', 100],
  },
}
