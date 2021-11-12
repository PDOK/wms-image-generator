import WMSCapabilities from 'ol/format/WMSCapabilities'
import { Map, View } from 'ol'
import WMTSSource from 'ol/source/WMTS'
import { Tile as TileLayer, Image as ImageLayer } from 'ol/layer'
import WMTSTileGrid from 'ol/tilegrid/WMTS.js'
import { register } from 'ol/proj/proj4.js'
import { transform } from 'ol/proj'
import proj4 from 'proj4'
import Projection from 'ol/proj/Projection'
import { getTopLeft } from 'ol/extent.js'
import ImageWMS from 'ol/source/ImageWMS'

import LayerSwitcher from 'ol-layerswitcher'
import 'ol/ol.css'
import 'ol-layerswitcher/src/ol-layerswitcher.css'

var currentLayer

// add map
const BRTA_ATTRIBUTION = 'Kaartgegevens: © <a href="http://www.cbs.nl">CBS</a>, <a href="http://www.kadaster.nl">Kadaster</a>, <a href="http://openstreetmap.org">OpenStreetMap</a><span class="printhide">-auteurs (<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>).</span>'
const LUFO_ATTRIBUTION = 'Kaartgegevens: © <a href="http://www.kadaster.nl">Kadaster</a><span class="printhide">-auteurs (<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>).</span>'

proj4.defs('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs')
register(proj4)
const RDPROJECTION = new Projection({
  code: 'EPSG:28992',
  extent: [-285401.92, 22598.08, 595401.92, 903401.92]
})

const RESOLUTIONS = [3440.640, 1720.320, 860.160, 430.080, 215.040, 107.520, 53.760, 26.880, 13.440, 6.720, 3.360, 1.680, 0.840, 0.420, 0.210]
const MATRIXIDS = new Array(15)
for (var i = 0; i < 15; ++i) {
  MATRIXIDS[i] = i
}

function stripQueryParams (serviceUrl) {
  const urlObj = new URL(serviceUrl)
  return `${urlObj.protocol}//${urlObj.host}:${urlObj.port}${urlObj.pathname}?`
}

function getWMSLayer (serviceUrl, serviceTitle, layers, styles) {
  const layersReversed = layers.reverse()
  const layersParam = layersReversed.join(',')
  const stylesReversed = styles.reverse()
  const stylesParam = stylesReversed.join(',')

  const wmsSource = new ImageWMS({
    crossOrigin: 'anonymous',
    url: stripQueryParams(serviceUrl),
    params: { LAYERS: layersParam, MAP_RESOLUTION: '96', STYLES: stylesParam },
    ratio: 1,
    hidpi: false,
    serverType: 'mapserver',
    projection: RDPROJECTION
  })
  return new ImageLayer({
    visible: true,
    opacity: document.getElementById('opacitySlider').value / 100,
    source: wmsSource,
    crossOrigin: 'anonymous'
  })
}

function switchLayer (serviceUrl, serviceTitle) {
  if (currentLayer) {
    MAP.removeLayer(currentLayer)
  }
  const layers = []
  const els = document.getElementsByClassName('layerCheck')
  const styleEls = document.getElementsByClassName('styleselect')
  const styles = []
  Array.prototype.forEach.call(els, function (el) {
    if (el.checked) {
      const currentLayer = el.getAttribute('layer')
      layers.push(currentLayer)
      Array.prototype.forEach.call(styleEls, function (styleEl) {
        const styleLyrName = styleEl.getAttribute('layer')
        if (currentLayer === styleLyrName) {
          styles.push(styleEl.value)
        }
      })
    }
  })
  currentLayer = getWMSLayer(serviceUrl, serviceTitle, layers, styles)
  MAP.addLayer(currentLayer)
  MAP.render()
}

function getWmtsLayer (serviceUrl, attribution, layername) {
  return new TileLayer({
    title: `${layername} WMTS`,
    visible: false,
    extent: RDPROJECTION.extent,
    source: new WMTSSource({
      crossOrigin: 'anonymous',
      url: serviceUrl,
      layer: layername,
      matrixSet: 'EPSG:28992',
      format: 'image/png',
      attributions: attribution,
      projection: RDPROJECTION,
      tileGrid: new WMTSTileGrid({
        origin: getTopLeft(RDPROJECTION.getExtent()),
        resolutions: RESOLUTIONS,
        matrixIds: MATRIXIDS
      }),
      style: 'default'
    })
  })
}

function getBRTALayer (layername) {
  return getWmtsLayer('https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0', BRTA_ATTRIBUTION, layername)
}

const brtWmtsLayer = getBRTALayer('standaard')
const brtGrijsWmtsLayer = getBRTALayer('grijs')
const brtPastelWmtsLayer = getBRTALayer('pastel')
const brtWaterWmtsLayer = getBRTALayer('water')
const lufoLayer = getWmtsLayer('https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0', LUFO_ATTRIBUTION, 'Actueel_ortho25')
brtGrijsWmtsLayer.set('visible', true)

const top10Layers = ['gebouwvlak', 'spoorbaandeellijn', 'waterdeelvlak', 'waterdeelvlakcontour', 'terreinvlakcontour', 'terreinvlak', 'wegdeelvlak', 'wegdeelvlakcontour']
const top10nlLayer = getWMSLayer('https://geodata.nationaalgeoregister.nl/top10nlv2/ows?', '',
  top10Layers, [])
top10nlLayer.set('title', 'Top10NL WMS')
top10nlLayer.set('visible', false)

brtWmtsLayer.set('base', true)
brtGrijsWmtsLayer.set('base', true)
brtPastelWmtsLayer.set('base', true)
brtWaterWmtsLayer.set('base', true)
lufoLayer.set('base', true)
top10nlLayer.set('base', true)

const MAP = new Map({
  layers: [
    top10nlLayer,
    brtWaterWmtsLayer,
    brtPastelWmtsLayer,
    brtGrijsWmtsLayer,
    brtWmtsLayer,
    lufoLayer
  ],
  target: document.getElementById('map'),
  view: new View({
    center: transform([5.43, 52.18], 'EPSG:4326', 'EPSG:28992'),
    zoom: 8,
    projection: 'EPSG:28992'
  })
})

var LAYERSWITCHER = new LayerSwitcher({
  tipLabel: 'Legend', // Optional label for button
  groupSelectStyle: 'none' // Can be 'children' [default], 'group' or 'none'
})
MAP.addControl(LAYERSWITCHER)

document.getElementById('export-png').addEventListener('click', function () {
  MAP.once('rendercomplete', function () {
    var mapCanvas = document.createElement('canvas')
    var size = MAP.getSize()
    mapCanvas.width = size[0]
    mapCanvas.height = size[1]
    var mapContext = mapCanvas.getContext('2d')
    Array.prototype.forEach.call(document.querySelectorAll('.ol-layer canvas'), function (canvas) {
      if (canvas.width > 0) {
        var opacity = canvas.parentNode.style.opacity
        mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity)
        var transform = canvas.style.transform
        // Get the transform parameters from the style's transform matrix
        var matrix = transform.match(/^matrix\(([^(]*)\)$/)[1].split(',').map(Number)
        // Apply the transform to the export map context
        CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix)
        mapContext.drawImage(canvas, 0, 0)
      }
    })
    if (navigator.msSaveBlob) {
      // link download attribuute does not work on MS browsers
      navigator.msSaveBlob(mapCanvas.msToBlob(), 'map.png')
    } else {
      var link = document.getElementById('image-download')
      link.href = mapCanvas.toDataURL('image/png', 1)
      link.click()
    }
  })
  MAP.renderSync()
})

function unpackLayers (capObj, result) {
  if (!Array.isArray(capObj)) {
    capObj = [capObj]
  }
  capObj.forEach(function (lyr) {
    if ('Layer' in lyr) {
      unpackLayers(lyr.Layer, result)
    } else {
      result.push(lyr)
    }
  })
  return result
}

function urlChanged () {
  const getMapUrlEl = document.getElementById('GetMapUrl')
  SERVICE_URL = getMapUrlEl.value
  const parser = new WMSCapabilities()
  fetch(SERVICE_URL).then(function (response) {
    return response.text()
  }).then(function (text) {
    var result = parser.read(text)
    SERVICE_TITLE = result.Service.Title
    let layers = []
    layers = unpackLayers(result.Capability, layers)
    const layerNames = []
    var tbl = document.getElementById('layerlist')
    tbl.innerHTML = ''
    var tblBody = document.createElement('tbody')
    layers.forEach(function (x) {
      layerNames.push(x.Name)
      var row = document.createElement('tr')
      row.setAttribute('draggable', 'true')
      row.classList.add('draggable')
      row.addEventListener('dragover', dragOver)
      row.addEventListener('dragstart', dragStart)
      var cell = document.createElement('td')
      var cellText = document.createTextNode(x.Name)
      var checkbox = document.createElement('input')
      var cell2 = document.createElement('td')
      var cell3 = document.createElement('td')
      var selectList = document.createElement('select')
      selectList.setAttribute('layer', x.Name)
      selectList.classList.add('styleselect')
      if (x.Style) {
        x.Style.forEach(function (style) {
          let title = style.Title
          if (!style.Title) {
            title = style.Name
            if (style.Name.indexOf(':') !== -1) {
              title = style.Name.split(':')[1]
            }
          }
          const option = document.createElement('option')
          option.value = style.Name
          option.text = title
          selectList.appendChild(option)
        })
      }
      selectList.addEventListener('change', function () {
        switchLayer(SERVICE_URL, SERVICE_TITLE)
      })
      cell3.appendChild(selectList)
      checkbox.type = 'checkbox'
      checkbox.checked = true
      checkbox.classList.add('layerCheck')
      checkbox.setAttribute('layer', x.Name)
      checkbox.addEventListener('change', function () {
        switchLayer(SERVICE_URL, SERVICE_TITLE)
      })
      cell2.appendChild(checkbox)
      cell.appendChild(cellText)
      row.appendChild(cell2)
      row.appendChild(cell)
      row.appendChild(cell3)
      tblBody.appendChild(row)
    })
    tbl.appendChild(tblBody)
    switchLayer(SERVICE_URL, SERVICE_TITLE)
  })
}

var SERVICE_URL
var SERVICE_TITLE

var GET_MAP_URL_EL = document.getElementById('GetMapUrl')
GET_MAP_URL_EL.addEventListener('blur', urlChanged)

const SL_EL = document.getElementById('opacitySlider')
SL_EL.addEventListener('change', function (e) {
  switchLayer(SERVICE_URL, SERVICE_TITLE)
})

var DRAG_EL
function dragOver (e) {
  const closestRow = e.target.closest('tr')
  if (isBefore(DRAG_EL, closestRow)) { closestRow.parentNode.insertBefore(DRAG_EL, closestRow) } else { closestRow.parentNode.insertBefore(DRAG_EL, closestRow.nextSibling) }
  switchLayer(SERVICE_URL, SERVICE_TITLE)
}

function dragStart (e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', null) // Thanks to bqlou for their comment.
  DRAG_EL = e.target
}

function isBefore (el1, el2) {
  if (el2.parentNode === el1.parentNode) {
    for (var cur = el1.previousSibling; cur && cur.nodeType !== 9; cur = cur.previousSibling) {
      if (cur === el2) { return true }
    }
  }
  return false
}

const SIZE_SELECT_EL = document.getElementById('sizeSelect')
const SIZE_INPUT_EL = document.getElementById('sizeInput')

function updateMapSize (sizeString) {
  const x = sizeString.split('x')[0]
  const y = sizeString.split('x')[1]
  const mapEl = document.getElementById('map')
  mapEl.style.width = `${x}px`
  mapEl.style.height = `${y}px`
  MAP.renderSync()
  MAP.updateSize()
}

SIZE_SELECT_EL.addEventListener('change', function (e) {
  updateMapSize(e.target.value)
})

SIZE_INPUT_EL.addEventListener('blur', function (e) {
  if (!e.target.value) {
    return
  }
  const regex = /[0-9]+[x|X][0-9]+/g
  console.log(e.target.value.match(regex))
  if (!e.target.value.match(regex)) {
    alert("size format should be '[0-9]+x[0-9]+' for instance 200x300")
    return
  }
  updateMapSize(e.target.value.toLowerCase())
})

const grayscaleCheckbox = document.getElementById('grayscaleBaselayers')

function postRender (evt) {
  evt.context.globalCompositeOperation = 'color'
  if (evt.context.globalCompositeOperation === 'color') {
    // operation is supported by browser
    evt.context.fillStyle = 'rgba(255,255,255,' + GRAYSCALE / 100 + ')'
    evt.context.fillRect(
      0,
      0,
      evt.context.canvas.width,
      evt.context.canvas.height
    )
  }
  evt.context.globalCompositeOperation = 'source-over'
}

var GRAYSCALE = grayscaleCheckbox.checked === true ? 100 : 0
grayscaleCheckbox.addEventListener('change', function (e) {
  GRAYSCALE = e.target.checked === true ? 100 : 0
  MAP.render()
})

MAP
  .getLayers().forEach(function (lyr) {
    if (lyr.get('base')) {
      // see comment on this answer https://stackoverflow.com/a/59819793
      lyr.on('postrender', postRender)
    }
  }
  )

var rad = document.getElementsByClassName('sizeRadio')
console.log(rad)
for (let i = 0; i < rad.length; i++) {
  rad[i].addEventListener('change', function () {
    const input = document.getElementById('sizeInput')
    const select = document.getElementById('sizeSelect')
    if (this.value === 'preset') {
      input.style.display = 'none'
      select.style.display = 'block'
    } else { // custom
      input.style.display = 'block'
      select.style.display = 'none'
    }
  })
}
document.getElementById('preset').checked = true
SIZE_SELECT_EL.value = '500x500'
