var { pipe, concat } = require('mississippi')

var DoozinEcToranoanaJp = require('./service')
var dt = new DoozinEcToranoanaJp()
var request = {
  category: 'act',
  value: 'みずきえいむ'
}

pipe(
  dt.createStream(request),
  concat(results => {
    var uri = dt.createURI(request)
    console.log(JSON.stringify({ uri, request, results }))
  }),
  error => {
    if (error) return console.error(error)
  }
)
