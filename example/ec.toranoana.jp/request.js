var DoozinEcToranoanaJp = require('./service')
var dt = new DoozinEcToranoanaJp()
var request = {
  category: 'mak',
  value: 'xration'
}

dt.request(request, (error, results) => {
  if (error) return console.log(error)
  var uri = dt.createURI(request)
  console.log({
    request, uri, results
  })
})
