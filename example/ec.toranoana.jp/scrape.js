var T = require('./service')
var fs = require('fs')
var path = require('path')
var { pipe, through } = require('mississippi')
var file = path.join(__dirname, 'result.html')
var c = 0
var t = new T

pipe(
  fs.createReadStream(file),
  t.scraper(),
  through.obj((data, _, done) => {
    console.log(data)
    done()
  }),
  error => {
    if (error) return console.log(error)
    console.log('END')
  }
)
