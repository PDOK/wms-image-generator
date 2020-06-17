import WMSCapabilities from 'ol/format/WMSCapabilities'
import { Map, View } from 'ol'
import WMTSSource from 'ol/source/WMTS'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import WMTSTileGrid from 'ol/tilegrid/WMTS.js'
import { register } from 'ol/proj/proj4.js'
import { transform } from 'ol/proj'
import { Circle as Fill, Stroke, Style } from 'ol/style';
import proj4 from 'proj4'
import Projection from 'ol/proj/Projection'
import { getTopLeft } from 'ol/extent.js'
import ImageWMS from 'ol/source/ImageWMS'
import { Image as ImageLayer } from 'ol/layer'

import LayerSwitcher from 'ol-layerswitcher'
import 'ol/ol.css'
import 'ol-layerswitcher/src/ol-layerswitcher.css'
var currentLayer

// add map
const BRTA_ATTRIBUTION = 'Kaartgegevens: © <a href="http://www.cbs.nl">CBS</a>, <a href="http://www.kadaster.nl">Kadaster</a>, <a href="http://openstreetmap.org">OpenStreetMap</a><span class="printhide">-auteurs (<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>).</span>'
const LUFO_ATTRIBUTION = 'Kaartgegevens: © <a href="http://www.kadaster.nl">Kadaster</a><span class="printhide">-auteurs (<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>).</span>'

proj4.defs('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs')
register(proj4)
const rdProjection = new Projection({
  code: 'EPSG:28992',
  extent: [-285401.92, 22598.08, 595401.92, 903401.92]
})

const resolutions = [3440.640, 1720.320, 860.160, 430.080, 215.040, 107.520, 53.760, 26.880, 13.440, 6.720, 3.360, 1.680, 0.840, 0.420, 0.210]
const matrixIds = new Array(15)
for (var i = 0; i < 15; ++i) {
  matrixIds[i] = i
}

function stripQueryParams(serviceUrl) {
  const urlObj = new URL(serviceUrl)
  return `${urlObj.protocol}//${urlObj.host}:${urlObj.port}${urlObj.pathname}?`
}

function getWMSLayer(serviceUrl, serviceTitle, layers, styles) {
  let layersReversed = layers.reverse()
  let layersParam = layersReversed.join(",")
  let stylesReversed = styles.reverse()
  let stylesParam = stylesReversed.join(",")
  console.log(layersParam)
  const wmsSource = new ImageWMS({
    crossOrigin: 'anonymous',
    url: stripQueryParams(serviceUrl),
    params: { LAYERS: layersParam, MAP_RESOLUTION: '96', STYLES: stylesParam },
    ratio: 1,
    hidpi: false,
    serverType: 'mapserver',
    projection: rdProjection
  })
  return new ImageLayer({
    visible: true,
    opacity: document.getElementById("opacitySlider").value/100,
    source: wmsSource,
    // title: serviceTitle,
    crossOrigin: 'anonymous'
  })
}





function switchLayer(serviceUrl, serviceTitle) {
  if (currentLayer) {
    map.removeLayer(currentLayer)
  }
  let layers = []

  let els = document.getElementsByClassName("layerCheck");
  let styleEls = document.getElementsByClassName("styleselect");
  let styles = []
  Array.prototype.forEach.call(els, function (el) {
    if (el.checked) {
      let currentLayer = el.getAttribute("layer")
      layers.push(currentLayer)
      Array.prototype.forEach.call(styleEls, function (styleEl) {
        let styleLyrName = styleEl.getAttribute("layer")
        if (currentLayer===styleLyrName){
          styles.push(styleEl.value)
        }
      })
    }
  });
  currentLayer = getWMSLayer(serviceUrl, serviceTitle, layers, styles)
  map.addLayer(currentLayer)
  map.render()
}


function getWmtsLayer(serviceUrl, attribution, layername) {
  return new TileLayer({
    title: `${layername} WMTS`,
    visible: false,
    extent: rdProjection.extent,
    source: new WMTSSource({
      crossOrigin: 'anonymous',
      url: serviceUrl,
      layer: layername,
      matrixSet: 'EPSG:28992',
      format: 'image/png',
      attributions: attribution,
      projection: rdProjection,
      tileGrid: new WMTSTileGrid({
        origin: getTopLeft(rdProjection.getExtent()),
        resolutions: resolutions,
        matrixIds: matrixIds
      }),
      style: 'default'
    })
  })
}

function getBRTALayer(layername) {
  return getWmtsLayer('https://geodata.nationaalgeoregister.nl/tiles/service/wmts', BRTA_ATTRIBUTION, layername)
}

const brtWmtsLayer = getBRTALayer('brtachtergrondkaart')
const brtGrijsWmtsLayer = getBRTALayer('brtachtergrondkaartgrijs')
const brtPastelWmtsLayer = getBRTALayer('brtachtergrondkaartpastel')
const brtWaterWmtsLayer = getBRTALayer('brtachtergrondkaartwater')
const lufoLayer = getWmtsLayer('https://geodata.nationaalgeoregister.nl/luchtfoto/rgb/wmts', LUFO_ATTRIBUTION, 'Actueel_ortho25')
brtGrijsWmtsLayer.set("visible", true)

const top10Layers = ["gebouwvlak","spoorbaandeellijn","waterdeelvlak","waterdeelvlakcontour","terreinvlakcontour","terreinvlak","wegdeelvlak","wegdeelvlakcontour"]
const top10nlLayer = getWMSLayer('https://geodata.nationaalgeoregister.nl/top10nlv2/ows?', '', top10Layers, [])
top10nlLayer.set("title", "Top10NL WMS")

// wegdeel_vlak_contour,wegdeel_vlak,terrein_vlak,terrein_vlak_contour,waterdeel_vlak_contour,waterdeel_vlak,spoorbaandeel_lijn,gebouw_vlak

// https://geodata.nationaalgeoregister.nl/top10nlv2/ows?SERVICE=WMS&


const map = new Map({
  layers: [
    top10nlLayer,
    brtWaterWmtsLayer,
    brtPastelWmtsLayer,
    brtGrijsWmtsLayer,
    brtWmtsLayer,
    lufoLayer
  ],
  target: document.getElementById("map"),
  view: new View({
    center: transform([5.43, 52.18], "EPSG:4326", 'EPSG:28992'),
    zoom: 8,
    projection: 'EPSG:28992'
  })
})


var layerSwitcher = new LayerSwitcher({
  tipLabel: 'Legend', // Optional label for button
  groupSelectStyle: 'none' // Can be 'children' [default], 'group' or 'none'
})
map.addControl(layerSwitcher)




document.getElementById('export-png').addEventListener('click', function () {
  map.once('rendercomplete', function () {
    var mapCanvas = document.createElement('canvas');
    var size = map.getSize();
    mapCanvas.width = size[0];
    mapCanvas.height = size[1];
    var mapContext = mapCanvas.getContext('2d');
    Array.prototype.forEach.call(document.querySelectorAll('.ol-layer canvas'), function (canvas) {
      if (canvas.width > 0) {
        var opacity = canvas.parentNode.style.opacity;
        mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
        var transform = canvas.style.transform;
        // Get the transform parameters from the style's transform matrix
        var matrix = transform.match(/^matrix\(([^\(]*)\)$/)[1].split(',').map(Number);
        // Apply the transform to the export map context
        CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
        mapContext.drawImage(canvas, 0, 0);
      }
    });
    if (navigator.msSaveBlob) {
      // link download attribuute does not work on MS browsers
      navigator.msSaveBlob(mapCanvas.msToBlob(), 'map.png');
    } else {
      var link = document.getElementById('image-download');
      link.href = mapCanvas.toDataURL("image/png", 1);
      link.click();
    }
  });
  map.renderSync();
});

function unpackLayers(capObj, result) {
  if (!Array.isArray(capObj)) {
    capObj = [capObj]
  }
  capObj.forEach(function (lyr) {
    if ("Layer" in lyr) {
      unpackLayers(lyr.Layer, result)
    } else {
      result.push(lyr)
    }
  })
  return result
}

function urlChanged() {
  let getMapUrlEl = document.getElementById("GetMapUrl")
  serviceUrl = getMapUrlEl.value

  const parser = new WMSCapabilities()
  fetch(serviceUrl).then(function (response) {
    return response.text()
  }).then(function (text) {
    var result = parser.read(text)
    serviceTitle = result["Service"]["Title"]
    let layers = []
    layers = unpackLayers(result.Capability, layers)
    let layerNames = []

    var tbl = document.getElementById("layerlist")
    tbl.innerHTML = ""
    var tblBody = document.createElement("tbody")

    layers.forEach(function (x) {
      layerNames.push(x["Name"])
      var row = document.createElement("tr")
      row.setAttribute("draggable", "true")
      row.classList.add("draggable")
      
      row.addEventListener('dragover', dragOver)
      row.addEventListener("dragstart", dragStart)

      var cell = document.createElement("td")
      var cellText = document.createTextNode(x["Name"])
      var checkbox = document.createElement('input')
      var cell2 = document.createElement("td")
      var cell3 = document.createElement("td")

      var selectList = document.createElement("select");
      selectList.setAttribute("layer", x["Name"])
      selectList.classList.add("styleselect")
      selectList.id = "mySelect";

      if (x.Style) {
        x.Style.forEach(function (style) {
          let title = style.Title
          if (!style.Title) {
            title = style.Name
            if (style.Name.indexOf(':') !== -1) {
              title = style.Name.split(':')[1]
            }
          }
          let option = document.createElement("option")
          option.value = style.Name
          option.text = title
          selectList.appendChild(option);
        })}

        selectList.addEventListener("change", function () {
          switchLayer(serviceUrl, serviceTitle)
        })

      cell3.appendChild(selectList);

      checkbox.type = "checkbox"
      checkbox.checked = true
      checkbox.classList.add("layerCheck")
      checkbox.setAttribute("layer", x["Name"])
      checkbox.addEventListener("change", function () {
        switchLayer(serviceUrl, serviceTitle)
      })
      cell2.appendChild(checkbox)
      cell.appendChild(cellText)
      row.appendChild(cell2)
      row.appendChild(cell)
      row.appendChild(cell3)
      tblBody.appendChild(row)
    })
    tbl.appendChild(tblBody)
    switchLayer(serviceUrl, serviceTitle)
  })
}

var serviceUrl
var serviceTitle

var getMapUrlEl = document.getElementById("GetMapUrl")
getMapUrlEl.addEventListener('blur', urlChanged)

let slEl = document.getElementById("opacitySlider")
slEl.addEventListener("change", function(e){
  switchLayer(serviceUrl, serviceTitle)
})
    // slDiv.appe



var _el
function dragOver(e) {
  console.log("over")
  let closestRow = e.target.closest("tr")
  if (isBefore(_el, closestRow))
  closestRow.parentNode.insertBefore(_el, closestRow);
  else
  closestRow.parentNode.insertBefore(_el, closestRow.nextSibling)
  switchLayer(serviceUrl, serviceTitle)
}

function dragStart(e) {
  console.log("start")
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", null); // Thanks to bqlou for their comment.
  _el = e.target;
}

function isBefore(el1, el2) {
  if (el2.parentNode === el1.parentNode)
    for (var cur = el1.previousSibling; cur && cur.nodeType !== 9; cur = cur.previousSibling)
      if (cur === el2)
        return true;
  return false;
}

