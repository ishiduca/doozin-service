var valid = require('is-my-json-valid')
var backoff = require('backoff')
// var urlencode = require('urlencode')
var hyperquest = require('hyperquest')
var { through, pipe, concat } = require('mississippi')

var defaultConfig = {
  hyperquest: require('./config-hyperquest'),
  backoff: require('./config-backoff'),
  urlencode: require('./config-urlencode')
}
var schemaConfig = require('./schema-config')
var schemaParams = require('./schema-params')

module.exports = DoozinService

function DoozinService (config) {
  if (!(this instanceof DoozinService)) return new DoozinService(config)
  this.config = config || defaultConfig

  var v = valid(schemaConfig)
  if (!v(this.config)) {
    throw custromError(
      'Invalid Config',
      { errors: v.errors, _: this.config },
      'ValidateConfigError'
    )
  }

  this.schemaParams = schemaParams
}

DoozinService.defaultConfig = defaultConfig
DoozinService.schemaConfig = schemaConfig

DoozinService.prototype.createStream = function (params) {
  var src = through.obj()
  this.makeRequest(params, (error, response) => {
    if (error) return src.emit('error', error)

    pipe(
      response,
      this.scraper(),
      through.obj((result, _, done) => {
        src.write(result)
        done()
      }),
      error => {
        if (error) src.emit('error', error)
        src.end()
      }
    )
  })

  return src
}

DoozinService.prototype.request = function (params, done) {
  this.makeRequest(params, (error, response) => {
    if (error) return done(error)
    pipe(
      response,
      this.scraper(),
      concat(results => {
        done(null, results)
      }),
      error => (error && done(error))
    )
  })
}

DoozinService.prototype._makeRequest = function (params, done) {
  var uri = this.createURI(params)
  var opts = this.createOpts(params)
  return backoff.call(hyperquest, uri, opts, done)
}

DoozinService.prototype.makeRequest = function (params, done) {
  this.validateRequestParams(params, (error) => {
    if (error) return done(error)

    var call = this._makeRequest(params, done)
    call.retryIf(error => /ENOTFOUND/.test(String(error)))
    call.failAfter(this.config.backoff.failAfter)
    call.start()
  })
}

DoozinService.prototype.validateRequestParams = function (params, done) {
  var v = valid(this.schemaParams)
  if (!v(params, { verbose: true })) {
    var msg = 'Invalid Params'
    var name = 'ValidateRequestParamsError'
    var data = { errors: v.errors, _: params }
    return done(custromError(msg, data, name))
  }

  done(null, params)
}

DoozinService.prototype.createURI = function (query) {
  throw new Error('".createURI" method must implement yourself')
}

DoozinService.prototype.createOpts = function (query) {
  throw new Error('".createOpts" method must implement yourself')
}

DoozinService.prototype.scraper = function () {
  throw new Error('".scraper" method must implement yourself')
}

function custromError (message, data, name) {
  var error = new Error(message)
  name && (error.name = name)
  error.data = data
  error.toJSON = function () {
    return {
      name: this.name,
      message: this.message,
      data: this.data
    }
  }
  return error
}
