var DoozinService = require('../../service')
var xtend = require('xtend')
var trumpet = require('trumpet')
var inherits = require('inherits')
var urlencode = require('urlencode')
var { through, duplex, concat } = require('mississippi')

inherits(DoozinServiceEcToranoanaJp, DoozinService)
module.exports = DoozinServiceEcToranoanaJp

function DoozinServiceEcToranoanaJp () {
  if (!(this instanceof DoozinServiceEcToranoanaJp)) {
    return new DoozinServiceEcToranoanaJp()
  }

  var origin = 'https://ec.toranoana.jp'
  var searchHome = origin + '/tora_r/ec/app/catalog/list/'
  var hyperquest = xtend(
    DoozinService.defaultConfig.hyperquest, { origin, searchHome }
  )
  var config = xtend(DoozinService.defaultConfig, { hyperquest })
  DoozinService.call(this, config)
}

DoozinServiceEcToranoanaJp.prototype.createURI = function ({ category, value, opts }) {
  var map = {
    mak: 'searchMaker',
    act: 'searchActor',
    nam: 'searchCommodityName',
    mch: 'searchChara',
    gnr: 'searchWord',
    kyw: 'searchWord',
    com: 'searchWord'
  }

  var query = xtend({
    searchCategoryCode: '04',
    searchChildrenCategoryCode: 'cot',
    searchBackorderFlg: 0,
    searchUsedItemFlg: 1,
    searchDisplay: 12,
    detailSearch: true
  }, { [map[category]]: value }, opts)

  return this.config.hyperquest.searchHome + '?' +
    urlencode.stringify(query, this.config.urlencode)
}

DoozinServiceEcToranoanaJp.prototype.createOpts = function (params) {
  return xtend({
    method: this.config.hyperquest.method,
    headers: xtend(this.config.hyperquest.headers, { cookie: 'adflg=0' })
  })
}

DoozinServiceEcToranoanaJp.prototype.scraper = function () {
  var tr = trumpet()
  var rs = through.obj()
  var selector = '#search-result-container.pull-right div ul.list li.list__item div.search-result-inside-container'
  var i = 0
  var isBingo = false
  var m = through.obj()
  m.on('pipe', s => (i += 1))
  m.on('unpipe', s => ((i -= 1) || m.end()))

  m.pipe(rs)

  tr.selectAll(selector, div => {
    isBingo = true
    var tr = trumpet()
    var src = through.obj()
    var snk = through.obj()
    var links = []

    snk.pipe(m, { end: false })

    src.pipe(concat(result => {
      var r = result.reduce((a, b) => xtend(a, b), {})
      snk.end(r)
    }))

    tr.select('div.product_img a', a => {
      a.getAttribute('href', href => {
        var tr = trumpet()
        tr.select('img', img => {
          img.getAttribute('data-src', srcOfThumbnail => {
            img.getAttribute('alt', title => {
              var urlOfTitle = this.config.hyperquest.origin + href
              src.write({ title, srcOfThumbnail, urlOfTitle })
            })
          })
        })
        a.createReadStream().pipe(tr)
      })
    })

    tr.selectAll('div.product_desc ul.product_labels li a', a => {
      var tr = trumpet()
      a.createReadStream().pipe(tr).pipe(concat(b => {
        a.getAttribute('href', _href => {
          var href = this.config.hyperquest.origin + _href
          links.push({ href, text: String(b).replace(/<[^>]+?>/g, '') })
        })
      }))
    })

    div.createReadStream().pipe(tr)
      .once('end', () => src.end({ links }))
  })

  tr.once('end', () => {
    if (!isBingo) m.end()
  })

  return duplex.obj(tr, rs)
}
