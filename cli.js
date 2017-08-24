#!/usr/bin/env node
'use strict'

const meow = require('meow')
const watchGHRepos = require('./src/index.js')
const Promise = require('bluebird')
const _ = require('lodash')
const gitconfig = require('gitconfiglocal')
const pify = require('pify')
const ghauth = pify(require('ghauth'))
const authOptions = {
  configName: 'watch-gh-repos',
  note: 'Watch, unwatch, or ignore GitHub repositories',
  userAgent: 'github.com/RichardLitt/watch-gh-repos',
  scopes: ['repo', 'user', 'notifications']
}

const cli = meow([`
  Usage
    $ watch-gh-repos <input> [opts]

  Options
    -g, --get Get repo watching details
    -i, --ignore Ignore notifications from a repository
    -o, --org Specify all repositories from an organization or user
    -r, --ratelimit Skip checks making sure GitHub repo is valid (Skips 1 hit per repo)
    -t, --token A token
    -u, --unwatch Unwatch instead of watch
    -w, --watch Specify a repo

  Examples
    ~/src/RichardLitt/unwatch-gh-repos $ watch-gh-repos
    Watched: RichardLitt/unwatch-gh-repos

    $ watch-gh-repos RichardLitt/watch-gh-repos
    Watched: RichardLitt/watch-gh-repos

    $ watch-gh-repos --unwatch RichardLitt/watch-gh-repos
    Unwatched: RichardLitt/watch-gh-repos

    $ watch-gh-repos --org --watch RichardLitt
    Watched: RichardLitt/first-repo
    ...
`], {
  string: ['get', 'ignore', 'watch', 'token', 'unwatch'],
  boolean: ['org', 'ratelimit'],
  alias: {
    g: 'get',
    i: 'ignore',
    o: 'org',
    t: 'token',
    u: 'unwatch',
    w: 'watch',
    r: 'ratelimit'
  }
})



function noOpts (opts) {
  return _.isEmpty(_.filter(opts, (opt, key) => {
    if (key !== 't' && key !== 'token' && opt) {
      return opt
    }
  }))
}

function getResponse (opts) {
  return Promise.resolve().then(() => watchGHRepos(opts))
  .then((data) => {
    if (_.isArray(data)) {
      _.forEach(data, (datum) => console.log(datum))
    } else {
      console.log(data)
    }
  })
}

Promise.resolve().then(() => {
  if (!cli.flags.token && !process.env.WATCH_GH_REPOS) {
    return Promise.resolve(ghauth(authOptions))
      .then((user) => user.token)
      .catch((err) => {
        if (err) {
          throw new Error('Unable to validate ghauth')
        }
      })
  }
}).then((token) => {
  cli.flags.token = token || cli.flags.token // Env set in index

  if (cli.input.length === 0 && noOpts(cli.flags)) {
    return pify(gitconfig)(process.cwd())
    .then(config => {
      if (config && config.remote && config.remote.origin && config.remote.origin.url) {
        var url = config.remote.origin.url
        return url.match(/([^/:]+\/[^/.]+)(\.git)?$/)[1]
      }
    }).then((res) => {
      cli.flags['get'] = res
      getResponse(cli.flags)
    })
  } else if (cli.input.length === 1 && noOpts(cli.flags)) {
    cli.flags['get'] = cli.input[0]
    return getResponse(cli.flags)
  } else {
    return getResponse(cli.flags)
  }
})


