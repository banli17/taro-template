(wx["webpackJsonp"] = wx["webpackJsonp"] || []).push([["components/painter/painter"],{

/***/ "./src/components/painter/lib/downloader.js":
/*!**************************************************!*\
  !*** ./src/components/painter/lib/downloader.js ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * LRU 文件存储，使用该 downloader 可以让下载的文件存储在本地，下次进入小程序后可以直接使用
 * 详细设计文档可查看 https://juejin.im/post/5b42d3ede51d4519277b6ce3
 */
var util = __webpack_require__(/*! ./util */ "./src/components/painter/lib/util.js");

var SAVED_FILES_KEY = 'savedFiles';
var KEY_TOTAL_SIZE = 'totalSize';
var KEY_PATH = 'path';
var KEY_TIME = 'time';
var KEY_SIZE = 'size';

// 可存储总共为 6M，目前小程序可允许的最大本地存储为 10M
var MAX_SPACE_IN_B = 6291456;
var savedFiles = {};

var Dowloader = function () {
  function Dowloader() {
    _classCallCheck(this, Dowloader);

    // app 如果设置了最大存储空间，则使用 app 中的
    if (getApp().PAINTER_MAX_LRU_SPACE) {
      MAX_SPACE_IN_B = getApp().PAINTER_MAX_LRU_SPACE;
    }
    wx.getStorage({
      key: SAVED_FILES_KEY,
      success: function success(res) {
        if (res.data) {
          savedFiles = res.data;
        }
      }
    });
  }

  /**
   * 下载文件，会用 lru 方式来缓存文件到本地
   * @param {String} url 文件的 url
   */


  _createClass(Dowloader, [{
    key: 'download',
    value: function download(url) {
      return new Promise(function (resolve, reject) {
        if (!(url && util.isValidUrl(url))) {
          resolve(url);
          return;
        }
        var file = getFile(url);

        if (file) {
          // 检查文件是否正常，不正常需要重新下载
          wx.getSavedFileInfo({
            filePath: file[KEY_PATH],
            success: function success(res) {
              resolve(file[KEY_PATH]);
            },
            fail: function fail(error) {
              console.error('the file is broken, redownload it, ' + JSON.stringify(error));
              downloadFile(url).then(function (path) {
                resolve(path);
              }, function () {
                reject();
              });
            }
          });
        } else {
          downloadFile(url).then(function (path) {
            resolve(path);
          }, function () {
            reject();
          });
        }
      });
    }
  }]);

  return Dowloader;
}();

exports.default = Dowloader;


function downloadFile(url) {
  return new Promise(function (resolve, reject) {
    wx.downloadFile({
      url: url,
      success: function success(res) {
        if (res.statusCode !== 200) {
          console.error('downloadFile ' + url + ' failed res.statusCode is not 200');
          reject();
          return;
        }
        var tempFilePath = res.tempFilePath;

        wx.getFileInfo({
          filePath: tempFilePath,
          success: function success(tmpRes) {
            var newFileSize = tmpRes.size;
            doLru(newFileSize).then(function () {
              saveFile(url, newFileSize, tempFilePath).then(function (filePath) {
                resolve(filePath);
              });
            }, function () {
              resolve(tempFilePath);
            });
          },
          fail: function fail(error) {
            // 文件大小信息获取失败，则此文件也不要进行存储
            console.error('getFileInfo ' + res.tempFilePath + ' failed, ' + JSON.stringify(error));
            resolve(res.tempFilePath);
          }
        });
      },
      fail: function fail(error) {
        console.error('downloadFile failed, ' + JSON.stringify(error) + ' ');
        reject();
      }
    });
  });
}

function saveFile(key, newFileSize, tempFilePath) {
  return new Promise(function (resolve, reject) {
    wx.saveFile({
      tempFilePath: tempFilePath,
      success: function success(fileRes) {
        var totalSize = savedFiles[KEY_TOTAL_SIZE] ? savedFiles[KEY_TOTAL_SIZE] : 0;
        savedFiles[key] = {};
        savedFiles[key][KEY_PATH] = fileRes.savedFilePath;
        savedFiles[key][KEY_TIME] = new Date().getTime();
        savedFiles[key][KEY_SIZE] = newFileSize;
        savedFiles['totalSize'] = newFileSize + totalSize;
        wx.setStorage({
          key: SAVED_FILES_KEY,
          data: savedFiles
        });
        resolve(fileRes.savedFilePath);
      },
      fail: function fail(error) {
        console.error('saveFile ' + key + ' failed, then we delete all files, ' + JSON.stringify(error));
        // 由于 saveFile 成功后，res.tempFilePath 处的文件会被移除，所以在存储未成功时，我们还是继续使用临时文件
        resolve(tempFilePath);
        // 如果出现错误，就直接情况本地的所有文件，因为你不知道是不是因为哪次lru的某个文件未删除成功
        reset();
      }
    });
  });
}

/**
 * 清空所有下载相关内容
 */
function reset() {
  wx.removeStorage({
    key: SAVED_FILES_KEY,
    success: function success() {
      wx.getSavedFileList({
        success: function success(listRes) {
          removeFiles(listRes.fileList);
        },
        fail: function fail(getError) {
          console.error('getSavedFileList failed, ' + JSON.stringify(getError));
        }
      });
    }
  });
}

function doLru(size) {
  return new Promise(function (resolve, reject) {
    var totalSize = savedFiles[KEY_TOTAL_SIZE] ? savedFiles[KEY_TOTAL_SIZE] : 0;

    if (size + totalSize <= MAX_SPACE_IN_B) {
      resolve();
      return;
    }
    // 如果加上新文件后大小超过最大限制，则进行 lru
    var pathsShouldDelete = [];
    // 按照最后一次的访问时间，从小到大排序
    var allFiles = JSON.parse(JSON.stringify(savedFiles));
    delete allFiles[KEY_TOTAL_SIZE];
    var sortedKeys = Object.keys(allFiles).sort(function (a, b) {
      return allFiles[a][KEY_TIME] - allFiles[b][KEY_TIME];
    });

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = sortedKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var sortedKey = _step.value;

        totalSize -= savedFiles[sortedKey].size;
        pathsShouldDelete.push(savedFiles[sortedKey][KEY_PATH]);
        delete savedFiles[sortedKey];
        if (totalSize + size < MAX_SPACE_IN_B) {
          break;
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    savedFiles['totalSize'] = totalSize;

    wx.setStorage({
      key: SAVED_FILES_KEY,
      data: savedFiles,
      success: function success() {
        // 保证 storage 中不会存在不存在的文件数据
        if (pathsShouldDelete.length > 0) {
          removeFiles(pathsShouldDelete);
        }
        resolve();
      },
      fail: function fail(error) {
        console.error('doLru setStorage failed, ' + JSON.stringify(error));
        reject();
      }
    });
  });
}

function removeFiles(pathsShouldDelete) {
  var _loop = function _loop(pathDel) {
    var delPath = pathDel;
    if ((typeof pathDel === 'undefined' ? 'undefined' : _typeof(pathDel)) === 'object') {
      delPath = pathDel.filePath;
    }
    wx.removeSavedFile({
      filePath: delPath,
      fail: function fail(error) {
        console.error('removeSavedFile ' + pathDel + ' failed, ' + JSON.stringify(error));
      }
    });
  };

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = pathsShouldDelete[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var pathDel = _step2.value;

      _loop(pathDel);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }
}

function getFile(key) {
  if (!savedFiles[key]) {
    return;
  }
  savedFiles[key]['time'] = new Date().getTime();
  wx.setStorage({
    key: SAVED_FILES_KEY,
    data: savedFiles
  });
  return savedFiles[key];
}

/***/ }),

/***/ "./src/components/painter/lib/gradient.js":
/*!************************************************!*\
  !*** ./src/components/painter/lib/gradient.js ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/* eslint-disable */
// 当ctx传入当前文件，const grd = ctx.createCircularGradient() 和 
// const grd = this.ctx.createLinearGradient() 无效，因此只能分开处理
// 先分析，在外部创建grd，再传入使用就可以

!function () {

  var api = {
    isGradient: function isGradient(bg) {
      if (bg && (bg.startsWith('linear') || bg.startsWith('radial'))) {
        return true;
      }
      return false;
    },

    doGradient: function doGradient(bg, width, height, ctx) {
      if (bg.startsWith('linear')) {
        linearEffect(width, height, bg, ctx);
      } else if (bg.startsWith('radial')) {
        radialEffect(width, height, bg, ctx);
      }
    }
  };

  function analizeGrad(string) {
    var colorPercents = string.substring(0, string.length - 1).split("%,");
    var colors = [];
    var percents = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = colorPercents[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var colorPercent = _step.value;

        colors.push(colorPercent.substring(0, colorPercent.lastIndexOf(" ")).trim());
        percents.push(colorPercent.substring(colorPercent.lastIndexOf(" "), colorPercent.length) / 100);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return { colors: colors, percents: percents };
  }

  function radialEffect(width, height, bg, ctx) {
    var colorPer = analizeGrad(bg.match(/radial-gradient\((.+)\)/)[1]);
    var grd = ctx.createCircularGradient(0, 0, width < height ? height / 2 : width / 2);
    for (var i = 0; i < colorPer.colors.length; i++) {
      grd.addColorStop(colorPer.percents[i], colorPer.colors[i]);
    }
    ctx.fillStyle = grd;
    //ctx.fillRect(-(width / 2), -(height / 2), width, height);
  }

  function analizeLinear(bg, width, height) {
    var direction = bg.match(/([-]?\d{1,3})deg/);
    var dir = direction && direction[1] ? parseFloat(direction[1]) : 0;
    var coordinate = void 0;
    switch (dir) {
      case 0:
        coordinate = [0, -height / 2, 0, height / 2];break;
      case 90:
        coordinate = [width / 2, 0, -width / 2, 0];break;
      case -90:
        coordinate = [-width / 2, 0, width / 2, 0];break;
      case 180:
        coordinate = [0, height / 2, 0, -height / 2];break;
      case -180:
        coordinate = [0, -height / 2, 0, height / 2];break;
      default:
        var x1 = 0;
        var y1 = 0;
        var x2 = 0;
        var y2 = 0;
        if (direction[1] > 0 && direction[1] < 90) {
          x1 = width / 2 - (width / 2 * Math.tan((90 - direction[1]) * Math.PI * 2 / 360) - height / 2) * Math.sin(2 * (90 - direction[1]) * Math.PI * 2 / 360) / 2;
          y2 = Math.tan((90 - direction[1]) * Math.PI * 2 / 360) * x1;
          x2 = -x1;
          y1 = -y2;
        } else if (direction[1] > -180 && direction[1] < -90) {
          x1 = -(width / 2) + (width / 2 * Math.tan((90 - direction[1]) * Math.PI * 2 / 360) - height / 2) * Math.sin(2 * (90 - direction[1]) * Math.PI * 2 / 360) / 2;
          y2 = Math.tan((90 - direction[1]) * Math.PI * 2 / 360) * x1;
          x2 = -x1;
          y1 = -y2;
        } else if (direction[1] > 90 && direction[1] < 180) {
          x1 = width / 2 + (-(width / 2) * Math.tan((90 - direction[1]) * Math.PI * 2 / 360) - height / 2) * Math.sin(2 * (90 - direction[1]) * Math.PI * 2 / 360) / 2;
          y2 = Math.tan((90 - direction[1]) * Math.PI * 2 / 360) * x1;
          x2 = -x1;
          y1 = -y2;
        } else {
          x1 = -(width / 2) - (-(width / 2) * Math.tan((90 - direction[1]) * Math.PI * 2 / 360) - height / 2) * Math.sin(2 * (90 - direction[1]) * Math.PI * 2 / 360) / 2;
          y2 = Math.tan((90 - direction[1]) * Math.PI * 2 / 360) * x1;
          x2 = -x1;
          y1 = -y2;
        }
        coordinate = [x1, y1, x2, y2];
        break;
    }
    return coordinate;
  }

  function linearEffect(width, height, bg, ctx) {
    var param = analizeLinear(bg, width, height);
    var grd = ctx.createLinearGradient(param[0], param[1], param[2], param[3]);
    var content = bg.match(/linear-gradient\((.+)\)/)[1];
    var colorPer = analizeGrad(content.substring(content.indexOf(',') + 1));
    for (var i = 0; i < colorPer.colors.length; i++) {
      grd.addColorStop(colorPer.percents[i], colorPer.colors[i]);
    }
    ctx.fillStyle = grd;
    //ctx.fillRect(-(width / 2), -(height / 2), width, height);
  }

  module.exports = { api: api };
}();

/***/ }),

/***/ "./src/components/painter/lib/pen.js":
/*!*******************************************!*\
  !*** ./src/components/painter/lib/pen.js ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var QR = __webpack_require__(/*! ./qrcode */ "./src/components/painter/lib/qrcode.js");
var GD = __webpack_require__(/*! ./gradient */ "./src/components/painter/lib/gradient.js");

var Painter = function () {
  function Painter(ctx, data) {
    _classCallCheck(this, Painter);

    this.ctx = ctx;
    this.data = data;
    this.globalWidth = {};
    this.globalHeight = {};
  }

  _createClass(Painter, [{
    key: "paint",
    value: function paint(callback) {
      this.style = {
        width: this.data.width.toPx(),
        height: this.data.height.toPx()
      };
      this._background();
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.data.views[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var view = _step.value;

          this._drawAbsolute(view);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.ctx.draw(false, function () {
        callback();
      });
    }
  }, {
    key: "_background",
    value: function _background() {
      this.ctx.save();
      var _style = this.style,
          width = _style.width,
          height = _style.height;

      var bg = this.data.background;
      this.ctx.translate(width / 2, height / 2);

      this._doClip(this.data.borderRadius, width, height);
      if (!bg) {
        // 如果未设置背景，则默认使用白色
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(-(width / 2), -(height / 2), width, height);
      } else if (bg.startsWith('#') || bg.startsWith('rgba') || bg.toLowerCase() === 'transparent') {
        // 背景填充颜色
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(-(width / 2), -(height / 2), width, height);
      } else if (GD.api.isGradient(bg)) {
        GD.api.doGradient(bg, width, height, this.ctx);
        this.ctx.fillRect(-(width / 2), -(height / 2), width, height);
      } else {
        // 背景填充图片
        this.ctx.drawImage(bg, -(width / 2), -(height / 2), width, height);
      }
      this.ctx.restore();
    }
  }, {
    key: "_drawAbsolute",
    value: function _drawAbsolute(view) {
      if (!view) {
        return;
      }
      // 证明 css 为数组形式，需要合并
      if (view.css && view.css.length) {
        /* eslint-disable no-param-reassign */
        view.css = Object.assign.apply(Object, _toConsumableArray(view.css));
      }
      switch (view.type) {
        case 'image':
          this._drawAbsImage(view);
          break;
        case 'text':
          this._fillAbsText(view);
          break;
        case 'rect':
          this._drawAbsRect(view);
          break;
        case 'qrcode':
          this._drawQRCode(view);
          break;
        default:
          break;
      }
    }

    /**
     * 根据 borderRadius 进行裁减
     */

  }, {
    key: "_doClip",
    value: function _doClip(borderRadius, width, height) {
      if (borderRadius && width && height) {
        var r = Math.min(borderRadius.toPx(), width / 2, height / 2);
        // 防止在某些机型上周边有黑框现象，此处如果直接设置 fillStyle 为透明，在 Android 机型上会导致被裁减的图片也变为透明， iOS 和 IDE 上不会
        // globalAlpha 在 1.9.90 起支持，低版本下无效，但把 fillStyle 设为了 white，相对默认的 black 要好点
        this.ctx.globalAlpha = 0;
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(-width / 2 + r, -height / 2 + r, r, 1 * Math.PI, 1.5 * Math.PI);
        this.ctx.lineTo(width / 2 - r, -height / 2);
        this.ctx.arc(width / 2 - r, -height / 2 + r, r, 1.5 * Math.PI, 2 * Math.PI);
        this.ctx.lineTo(width / 2, height / 2 - r);
        this.ctx.arc(width / 2 - r, height / 2 - r, r, 0, 0.5 * Math.PI);
        this.ctx.lineTo(-width / 2 + r, height / 2);
        this.ctx.arc(-width / 2 + r, height / 2 - r, r, 0.5 * Math.PI, 1 * Math.PI);
        this.ctx.closePath();
        this.ctx.fill();
        // 在 ios 的 6.6.6 版本上 clip 有 bug，禁掉此类型上的 clip，也就意味着，在此版本微信的 ios 设备下无法使用 border 属性
        if (!(getApp().systemInfo && getApp().systemInfo.version <= '6.6.6' && getApp().systemInfo.platform === 'ios')) {
          this.ctx.clip();
        }
        this.ctx.globalAlpha = 1;
      }
    }

    /**
     * 画边框
     */

  }, {
    key: "_doBorder",
    value: function _doBorder(view, width, height) {
      if (!view.css) {
        return;
      }
      var _view$css = view.css,
          borderRadius = _view$css.borderRadius,
          borderWidth = _view$css.borderWidth,
          borderColor = _view$css.borderColor;

      if (!borderWidth) {
        return;
      }
      this.ctx.save();
      this._preProcess(view, true);
      var r = void 0;
      if (borderRadius) {
        r = Math.min(borderRadius.toPx(), width / 2, height / 2);
      } else {
        r = 0;
      }
      var lineWidth = borderWidth.toPx();
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = borderColor || 'black';
      this.ctx.beginPath();
      this.ctx.arc(-width / 2 + r, -height / 2 + r, r + lineWidth / 2, 1 * Math.PI, 1.5 * Math.PI);
      this.ctx.lineTo(width / 2 - r, -height / 2 - lineWidth / 2);
      this.ctx.arc(width / 2 - r, -height / 2 + r, r + lineWidth / 2, 1.5 * Math.PI, 2 * Math.PI);
      this.ctx.lineTo(width / 2 + lineWidth / 2, height / 2 - r);
      this.ctx.arc(width / 2 - r, height / 2 - r, r + lineWidth / 2, 0, 0.5 * Math.PI);
      this.ctx.lineTo(-width / 2 + r, height / 2 + lineWidth / 2);
      this.ctx.arc(-width / 2 + r, height / 2 - r, r + lineWidth / 2, 0.5 * Math.PI, 1 * Math.PI);
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    }
  }, {
    key: "_preProcess",
    value: function _preProcess(view, notClip) {
      var width = 0;
      var height = void 0;
      var extra = void 0;
      switch (view.type) {
        case 'text':
          {
            var textArray = view.text.split('\n');
            // 处理多个连续的'\n'
            for (var i = 0; i < textArray.length; ++i) {
              if (textArray[i] === '') {
                textArray[i] = ' ';
              }
            }
            var fontWeight = view.css.fontWeight === 'bold' ? 'bold' : 'normal';
            view.css.fontSize = view.css.fontSize ? view.css.fontSize : '20rpx';
            this.ctx.font = "normal " + fontWeight + " " + view.css.fontSize.toPx() + "px " + (view.css.fontFamily ? view.css.fontFamily : 'sans-serif');
            // this.ctx.setFontSize(view.css.fontSize.toPx());
            // 计算行数
            var lines = 0;
            var linesArray = [];
            for (var _i = 0; _i < textArray.length; ++_i) {
              var textLength = this.ctx.measureText(textArray[_i]).width;
              var partWidth = view.css.width ? view.css.width.toPx() : textLength;
              var calLines = Math.ceil(textLength / partWidth);
              width = partWidth > width ? partWidth : width;
              lines += calLines;
              linesArray[_i] = calLines;
            }
            lines = view.css.maxLines < lines ? view.css.maxLines : lines;
            var lineHeight = view.css.lineHeight ? view.css.lineHeight.toPx() : view.css.fontSize.toPx();
            height = lineHeight * lines;
            extra = {
              lines: lines,
              lineHeight: lineHeight,
              textArray: textArray,
              linesArray: linesArray
            };
            break;
          }
        case 'image':
          {
            // image的长宽设置成auto的逻辑处理
            var ratio = getApp().systemInfo.pixelRatio ? getApp().systemInfo.pixelRatio : 2;
            // 有css却未设置width或height，则默认为auto
            if (view.css) {
              if (!view.css.width) {
                view.css.width = 'auto';
              }
              if (!view.css.height) {
                view.css.height = 'auto';
              }
            }
            if (!view.css || view.css.width === 'auto' && view.css.height === 'auto') {
              width = Math.round(view.sWidth / ratio);
              height = Math.round(view.sHeight / ratio);
            } else if (view.css.width === 'auto') {
              height = view.css.height.toPx();
              width = view.sWidth / view.sHeight * height;
            } else if (view.css.height === 'auto') {
              width = view.css.width.toPx();
              height = view.sHeight / view.sWidth * width;
            } else {
              width = view.css.width.toPx();
              height = view.css.height.toPx();
            }
            break;
          }
        default:
          if (!(view.css.width && view.css.height)) {
            console.error('You should set width and height');
            return;
          }
          width = view.css.width.toPx();
          height = view.css.height.toPx();
          break;
      }
      var x = void 0;
      if (view.css && view.css.right) {
        if (typeof view.css.right === 'string') {
          x = this.style.width - view.css.right.toPx(true);
        } else {
          // 可以用数组方式，把文字长度计算进去
          // [right, 文字id, 乘数（默认 1）]
          var rights = view.css.right;
          x = this.style.width - rights[0].toPx(true) - this.globalWidth[rights[1]] * (rights[2] || 1);
        }
      } else if (view.css && view.css.left) {
        if (typeof view.css.left === 'string') {
          x = view.css.left.toPx(true);
        } else {
          var lefts = view.css.left;
          x = lefts[0].toPx(true) + this.globalWidth[lefts[1]] * (lefts[2] || 1);
        }
      } else {
        x = 0;
      }
      //const y = view.css && view.css.bottom ? this.style.height - height - view.css.bottom.toPx(true) : (view.css && view.css.top ? view.css.top.toPx(true) : 0);
      var y = void 0;
      if (view.css && view.css.bottom) {
        y = this.style.height - height - view.css.bottom.toPx(true);
      } else {
        if (view.css && view.css.top) {
          if (typeof view.css.top === 'string') {
            y = view.css.top.toPx(true);
          } else {
            var tops = view.css.top;
            y = tops[0].toPx(true) + this.globalHeight[tops[1]] * (tops[2] || 1);
          }
        } else {
          y = 0;
        }
      }

      var angle = view.css && view.css.rotate ? this._getAngle(view.css.rotate) : 0;
      // 当设置了 right 时，默认 align 用 right，反之用 left
      var align = view.css && view.css.align ? view.css.align : view.css && view.css.right ? 'right' : 'left';
      switch (align) {
        case 'center':
          this.ctx.translate(x, y + height / 2);
          break;
        case 'right':
          this.ctx.translate(x - width / 2, y + height / 2);
          break;
        default:
          this.ctx.translate(x + width / 2, y + height / 2);
          break;
      }
      this.ctx.rotate(angle);
      if (!notClip && view.css && view.css.borderRadius && view.type !== 'rect') {
        this._doClip(view.css.borderRadius, width, height);
      }
      this._doShadow(view);
      if (view.id) {
        this.globalWidth[view.id] = width;
        this.globalHeight[view.id] = height;
      }
      return {
        width: width,
        height: height,
        x: x,
        y: y,
        extra: extra
      };
    }

    // 画文字的背景图片

  }, {
    key: "_doBackground",
    value: function _doBackground(view) {
      this.ctx.save();

      var _preProcess2 = this._preProcess(view, true),
          rawWidth = _preProcess2.width,
          rawHeight = _preProcess2.height;

      var _view$css2 = view.css,
          background = _view$css2.background,
          padding = _view$css2.padding;

      var pd = [0, 0, 0, 0];
      if (padding) {
        var pdg = padding.split(/\s+/);
        if (pdg.length === 1) {
          var x = pdg[0].toPx();
          pd = [x, x, x, x];
        }
        if (pdg.length === 2) {
          var _x = pdg[0].toPx();
          var y = pdg[1].toPx();
          pd = [_x, y, _x, y];
        }
        if (pdg.length === 3) {
          var _x2 = pdg[0].toPx();
          var _y = pdg[1].toPx();
          var z = pdg[2].toPx();
          pd = [_x2, _y, z, _y];
        }
        if (pdg.length === 4) {
          var _x3 = pdg[0].toPx();
          var _y2 = pdg[1].toPx();
          var _z = pdg[2].toPx();
          var a = pdg[3].toPx();
          pd = [_x3, _y2, _z, a];
        }
      }
      var width = rawWidth + pd[1] + pd[3];
      var height = rawHeight + pd[0] + pd[2];
      this._doClip(view.css.borderRadius, width, height);
      if (GD.api.isGradient(background)) {
        GD.api.doGradient(background, width, height, this.ctx);
      } else {
        this.ctx.fillStyle = background;
      }
      this.ctx.fillRect(-(width / 2), -(height / 2), width, height);

      this.ctx.restore();
    }
  }, {
    key: "_drawQRCode",
    value: function _drawQRCode(view) {
      this.ctx.save();

      var _preProcess3 = this._preProcess(view),
          width = _preProcess3.width,
          height = _preProcess3.height;

      QR.api.draw(view.content, this.ctx, -width / 2, -height / 2, width, height, view.css.background, view.css.color);
      this.ctx.restore();
      this._doBorder(view, width, height);
    }
  }, {
    key: "_drawAbsImage",
    value: function _drawAbsImage(view) {
      if (!view.url) {
        return;
      }
      this.ctx.save();

      var _preProcess4 = this._preProcess(view),
          width = _preProcess4.width,
          height = _preProcess4.height;
      // 获得缩放到图片大小级别的裁减框


      var rWidth = view.sWidth;
      var rHeight = view.sHeight;
      var startX = 0;
      var startY = 0;
      // 绘画区域比例
      var cp = width / height;
      // 原图比例
      var op = view.sWidth / view.sHeight;
      if (cp >= op) {
        rHeight = rWidth / cp;
        startY = Math.round((view.sHeight - rHeight) / 2);
      } else {
        rWidth = rHeight * cp;
        startX = Math.round((view.sWidth - rWidth) / 2);
      }
      if (view.css && view.css.mode === 'scaleToFill') {
        this.ctx.drawImage(view.url, -(width / 2), -(height / 2), width, height);
      } else {
        this.ctx.drawImage(view.url, startX, startY, rWidth, rHeight, -(width / 2), -(height / 2), width, height);
      }
      this.ctx.restore();
      this._doBorder(view, width, height);
    }
  }, {
    key: "_fillAbsText",
    value: function _fillAbsText(view) {
      if (!view.text) {
        return;
      }
      if (view.css.background) {
        // 生成背景
        this._doBackground(view);
      }
      this.ctx.save();

      var _preProcess5 = this._preProcess(view, view.css.background && view.css.borderRadius),
          width = _preProcess5.width,
          height = _preProcess5.height,
          extra = _preProcess5.extra;

      this.ctx.fillStyle = view.css.color || 'black';
      var lines = extra.lines,
          lineHeight = extra.lineHeight,
          textArray = extra.textArray,
          linesArray = extra.linesArray;
      // 如果设置了id，则保留 text 的长度

      if (view.id) {
        var textWidth = 0;
        for (var i = 0; i < textArray.length; ++i) {
          textWidth = this.ctx.measureText(textArray[i]).width > textWidth ? this.ctx.measureText(textArray[i]).width : textWidth;
        }
        this.globalWidth[view.id] = width ? textWidth < width ? textWidth : width : textWidth;
      }
      var lineIndex = 0;
      for (var j = 0; j < textArray.length; ++j) {
        var preLineLength = Math.round(textArray[j].length / linesArray[j]);
        var start = 0;
        var alreadyCount = 0;
        for (var _i2 = 0; _i2 < linesArray[j]; ++_i2) {
          // 绘制行数大于最大行数，则直接跳出循环
          if (lineIndex >= lines) {
            break;
          }
          alreadyCount = preLineLength;
          var text = textArray[j].substr(start, alreadyCount);
          var measuredWith = this.ctx.measureText(text).width;
          // 如果测量大小小于width一个字符的大小，则进行补齐，如果测量大小超出 width，则进行减除
          // 如果已经到文本末尾，也不要进行该循环
          while (start + alreadyCount <= textArray[j].length && (width - measuredWith > view.css.fontSize.toPx() || measuredWith > width)) {
            if (measuredWith < width) {
              text = textArray[j].substr(start, ++alreadyCount);
            } else {
              if (text.length <= 1) {
                // 如果只有一个字符时，直接跳出循环
                break;
              }
              text = textArray[j].substr(start, --alreadyCount);
            }
            measuredWith = this.ctx.measureText(text).width;
          }
          start += text.length;
          // 如果是最后一行了，发现还有未绘制完的内容，则加...
          if (lineIndex === lines - 1 && (j < textArray.length - 1 || start < textArray[j].length)) {
            while (this.ctx.measureText(text + "...").width > width) {
              if (text.length <= 1) {
                // 如果只有一个字符时，直接跳出循环
                break;
              }
              text = text.substring(0, text.length - 1);
            }
            text += '...';
            measuredWith = this.ctx.measureText(text).width;
          }
          this.ctx.setTextAlign(view.css.textAlign ? view.css.textAlign : 'left');
          var x = void 0;
          switch (view.css.textAlign) {
            case 'center':
              x = 0;
              break;
            case 'right':
              x = width / 2;
              break;
            default:
              x = -(width / 2);
              break;
          }
          var y = -(height / 2) + (lineIndex === 0 ? view.css.fontSize.toPx() : view.css.fontSize.toPx() + lineIndex * lineHeight);
          lineIndex++;
          if (view.css.textStyle === 'stroke') {
            this.ctx.strokeText(text, x, y, measuredWith);
          } else {
            this.ctx.fillText(text, x, y, measuredWith);
          }
          var fontSize = view.css.fontSize.toPx();
          if (view.css.textDecoration) {
            this.ctx.beginPath();
            if (/\bunderline\b/.test(view.css.textDecoration)) {
              this.ctx.moveTo(x, y);
              this.ctx.lineTo(x + measuredWith, y);
            }
            if (/\boverline\b/.test(view.css.textDecoration)) {
              this.ctx.moveTo(x, y - fontSize);
              this.ctx.lineTo(x + measuredWith, y - fontSize);
            }
            if (/\bline-through\b/.test(view.css.textDecoration)) {
              this.ctx.moveTo(x, y - fontSize / 3);
              this.ctx.lineTo(x + measuredWith, y - fontSize / 3);
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = view.css.color;
            this.ctx.stroke();
          }
        }
      }
      this.ctx.restore();
      this._doBorder(view, width, height);
    }
  }, {
    key: "_drawAbsRect",
    value: function _drawAbsRect(view) {
      this.ctx.save();

      var _preProcess6 = this._preProcess(view),
          width = _preProcess6.width,
          height = _preProcess6.height;

      if (GD.api.isGradient(view.css.color)) {
        GD.api.doGradient(view.css.color, width, height, this.ctx);
      } else {
        this.ctx.fillStyle = view.css.color;
      }
      var borderRadius = view.css.borderRadius;
      var r = borderRadius ? Math.min(borderRadius.toPx(), width / 2, height / 2) : 0;
      this.ctx.beginPath();
      this.ctx.arc(-width / 2 + r, -height / 2 + r, r, 1 * Math.PI, 1.5 * Math.PI); //左上角圆弧
      this.ctx.lineTo(width / 2 - r, -height / 2);
      this.ctx.arc(width / 2 - r, -height / 2 + r, r, 1.5 * Math.PI, 2 * Math.PI); // 右上角圆弧
      this.ctx.lineTo(width / 2, height / 2 - r);
      this.ctx.arc(width / 2 - r, height / 2 - r, r, 0, 0.5 * Math.PI); // 右下角圆弧
      this.ctx.lineTo(-width / 2 + r, height / 2);
      this.ctx.arc(-width / 2 + r, height / 2 - r, r, 0.5 * Math.PI, 1 * Math.PI); // 左下角圆弧
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
      this._doBorder(view, width, height);
    }

    // shadow 支持 (x, y, blur, color), 不支持 spread
    // shadow:0px 0px 10px rgba(0,0,0,0.1);

  }, {
    key: "_doShadow",
    value: function _doShadow(view) {
      if (!view.css || !view.css.shadow) {
        return;
      }
      var box = view.css.shadow.replace(/,\s+/g, ',').split(' ');
      if (box.length > 4) {
        console.error('shadow don\'t spread option');
        return;
      }
      this.ctx.shadowOffsetX = parseInt(box[0], 10);
      this.ctx.shadowOffsetY = parseInt(box[1], 10);
      this.ctx.shadowBlur = parseInt(box[2], 10);
      this.ctx.shadowColor = box[3];
    }
  }, {
    key: "_getAngle",
    value: function _getAngle(angle) {
      return Number(angle) * Math.PI / 180;
    }
  }]);

  return Painter;
}();

exports.default = Painter;

/***/ }),

/***/ "./src/components/painter/lib/qrcode.js":
/*!**********************************************!*\
  !*** ./src/components/painter/lib/qrcode.js ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/* eslint-disable */
!function () {

  // alignment pattern
  var adelta = [0, 11, 15, 19, 23, 27, 31, 16, 18, 20, 22, 24, 26, 28, 20, 22, 24, 24, 26, 28, 28, 22, 24, 24, 26, 26, 28, 28, 24, 24, 26, 26, 26, 28, 28, 24, 26, 26, 26, 28, 28];

  // version block
  var vpat = [0xc94, 0x5bc, 0xa99, 0x4d3, 0xbf6, 0x762, 0x847, 0x60d, 0x928, 0xb78, 0x45d, 0xa17, 0x532, 0x9a6, 0x683, 0x8c9, 0x7ec, 0xec4, 0x1e1, 0xfab, 0x08e, 0xc1a, 0x33f, 0xd75, 0x250, 0x9d5, 0x6f0, 0x8ba, 0x79f, 0xb0b, 0x42e, 0xa64, 0x541, 0xc69];

  // final format bits with mask: level << 3 | mask
  var fmtword = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976, //L
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0, //M
  0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed, //Q
  0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b //H
  ];

  // 4 per version: number of blocks 1,2; data width; ecc width
  var eccblocks = [1, 0, 19, 7, 1, 0, 16, 10, 1, 0, 13, 13, 1, 0, 9, 17, 1, 0, 34, 10, 1, 0, 28, 16, 1, 0, 22, 22, 1, 0, 16, 28, 1, 0, 55, 15, 1, 0, 44, 26, 2, 0, 17, 18, 2, 0, 13, 22, 1, 0, 80, 20, 2, 0, 32, 18, 2, 0, 24, 26, 4, 0, 9, 16, 1, 0, 108, 26, 2, 0, 43, 24, 2, 2, 15, 18, 2, 2, 11, 22, 2, 0, 68, 18, 4, 0, 27, 16, 4, 0, 19, 24, 4, 0, 15, 28, 2, 0, 78, 20, 4, 0, 31, 18, 2, 4, 14, 18, 4, 1, 13, 26, 2, 0, 97, 24, 2, 2, 38, 22, 4, 2, 18, 22, 4, 2, 14, 26, 2, 0, 116, 30, 3, 2, 36, 22, 4, 4, 16, 20, 4, 4, 12, 24, 2, 2, 68, 18, 4, 1, 43, 26, 6, 2, 19, 24, 6, 2, 15, 28, 4, 0, 81, 20, 1, 4, 50, 30, 4, 4, 22, 28, 3, 8, 12, 24, 2, 2, 92, 24, 6, 2, 36, 22, 4, 6, 20, 26, 7, 4, 14, 28, 4, 0, 107, 26, 8, 1, 37, 22, 8, 4, 20, 24, 12, 4, 11, 22, 3, 1, 115, 30, 4, 5, 40, 24, 11, 5, 16, 20, 11, 5, 12, 24, 5, 1, 87, 22, 5, 5, 41, 24, 5, 7, 24, 30, 11, 7, 12, 24, 5, 1, 98, 24, 7, 3, 45, 28, 15, 2, 19, 24, 3, 13, 15, 30, 1, 5, 107, 28, 10, 1, 46, 28, 1, 15, 22, 28, 2, 17, 14, 28, 5, 1, 120, 30, 9, 4, 43, 26, 17, 1, 22, 28, 2, 19, 14, 28, 3, 4, 113, 28, 3, 11, 44, 26, 17, 4, 21, 26, 9, 16, 13, 26, 3, 5, 107, 28, 3, 13, 41, 26, 15, 5, 24, 30, 15, 10, 15, 28, 4, 4, 116, 28, 17, 0, 42, 26, 17, 6, 22, 28, 19, 6, 16, 30, 2, 7, 111, 28, 17, 0, 46, 28, 7, 16, 24, 30, 34, 0, 13, 24, 4, 5, 121, 30, 4, 14, 47, 28, 11, 14, 24, 30, 16, 14, 15, 30, 6, 4, 117, 30, 6, 14, 45, 28, 11, 16, 24, 30, 30, 2, 16, 30, 8, 4, 106, 26, 8, 13, 47, 28, 7, 22, 24, 30, 22, 13, 15, 30, 10, 2, 114, 28, 19, 4, 46, 28, 28, 6, 22, 28, 33, 4, 16, 30, 8, 4, 122, 30, 22, 3, 45, 28, 8, 26, 23, 30, 12, 28, 15, 30, 3, 10, 117, 30, 3, 23, 45, 28, 4, 31, 24, 30, 11, 31, 15, 30, 7, 7, 116, 30, 21, 7, 45, 28, 1, 37, 23, 30, 19, 26, 15, 30, 5, 10, 115, 30, 19, 10, 47, 28, 15, 25, 24, 30, 23, 25, 15, 30, 13, 3, 115, 30, 2, 29, 46, 28, 42, 1, 24, 30, 23, 28, 15, 30, 17, 0, 115, 30, 10, 23, 46, 28, 10, 35, 24, 30, 19, 35, 15, 30, 17, 1, 115, 30, 14, 21, 46, 28, 29, 19, 24, 30, 11, 46, 15, 30, 13, 6, 115, 30, 14, 23, 46, 28, 44, 7, 24, 30, 59, 1, 16, 30, 12, 7, 121, 30, 12, 26, 47, 28, 39, 14, 24, 30, 22, 41, 15, 30, 6, 14, 121, 30, 6, 34, 47, 28, 46, 10, 24, 30, 2, 64, 15, 30, 17, 4, 122, 30, 29, 14, 46, 28, 49, 10, 24, 30, 24, 46, 15, 30, 4, 18, 122, 30, 13, 32, 46, 28, 48, 14, 24, 30, 42, 32, 15, 30, 20, 4, 117, 30, 40, 7, 47, 28, 43, 22, 24, 30, 10, 67, 15, 30, 19, 6, 118, 30, 18, 31, 47, 28, 34, 34, 24, 30, 20, 61, 15, 30];

  // Galois field log table
  var glog = [0xff, 0x00, 0x01, 0x19, 0x02, 0x32, 0x1a, 0xc6, 0x03, 0xdf, 0x33, 0xee, 0x1b, 0x68, 0xc7, 0x4b, 0x04, 0x64, 0xe0, 0x0e, 0x34, 0x8d, 0xef, 0x81, 0x1c, 0xc1, 0x69, 0xf8, 0xc8, 0x08, 0x4c, 0x71, 0x05, 0x8a, 0x65, 0x2f, 0xe1, 0x24, 0x0f, 0x21, 0x35, 0x93, 0x8e, 0xda, 0xf0, 0x12, 0x82, 0x45, 0x1d, 0xb5, 0xc2, 0x7d, 0x6a, 0x27, 0xf9, 0xb9, 0xc9, 0x9a, 0x09, 0x78, 0x4d, 0xe4, 0x72, 0xa6, 0x06, 0xbf, 0x8b, 0x62, 0x66, 0xdd, 0x30, 0xfd, 0xe2, 0x98, 0x25, 0xb3, 0x10, 0x91, 0x22, 0x88, 0x36, 0xd0, 0x94, 0xce, 0x8f, 0x96, 0xdb, 0xbd, 0xf1, 0xd2, 0x13, 0x5c, 0x83, 0x38, 0x46, 0x40, 0x1e, 0x42, 0xb6, 0xa3, 0xc3, 0x48, 0x7e, 0x6e, 0x6b, 0x3a, 0x28, 0x54, 0xfa, 0x85, 0xba, 0x3d, 0xca, 0x5e, 0x9b, 0x9f, 0x0a, 0x15, 0x79, 0x2b, 0x4e, 0xd4, 0xe5, 0xac, 0x73, 0xf3, 0xa7, 0x57, 0x07, 0x70, 0xc0, 0xf7, 0x8c, 0x80, 0x63, 0x0d, 0x67, 0x4a, 0xde, 0xed, 0x31, 0xc5, 0xfe, 0x18, 0xe3, 0xa5, 0x99, 0x77, 0x26, 0xb8, 0xb4, 0x7c, 0x11, 0x44, 0x92, 0xd9, 0x23, 0x20, 0x89, 0x2e, 0x37, 0x3f, 0xd1, 0x5b, 0x95, 0xbc, 0xcf, 0xcd, 0x90, 0x87, 0x97, 0xb2, 0xdc, 0xfc, 0xbe, 0x61, 0xf2, 0x56, 0xd3, 0xab, 0x14, 0x2a, 0x5d, 0x9e, 0x84, 0x3c, 0x39, 0x53, 0x47, 0x6d, 0x41, 0xa2, 0x1f, 0x2d, 0x43, 0xd8, 0xb7, 0x7b, 0xa4, 0x76, 0xc4, 0x17, 0x49, 0xec, 0x7f, 0x0c, 0x6f, 0xf6, 0x6c, 0xa1, 0x3b, 0x52, 0x29, 0x9d, 0x55, 0xaa, 0xfb, 0x60, 0x86, 0xb1, 0xbb, 0xcc, 0x3e, 0x5a, 0xcb, 0x59, 0x5f, 0xb0, 0x9c, 0xa9, 0xa0, 0x51, 0x0b, 0xf5, 0x16, 0xeb, 0x7a, 0x75, 0x2c, 0xd7, 0x4f, 0xae, 0xd5, 0xe9, 0xe6, 0xe7, 0xad, 0xe8, 0x74, 0xd6, 0xf4, 0xea, 0xa8, 0x50, 0x58, 0xaf];

  // Galios field exponent table
  var gexp = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1d, 0x3a, 0x74, 0xe8, 0xcd, 0x87, 0x13, 0x26, 0x4c, 0x98, 0x2d, 0x5a, 0xb4, 0x75, 0xea, 0xc9, 0x8f, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x60, 0xc0, 0x9d, 0x27, 0x4e, 0x9c, 0x25, 0x4a, 0x94, 0x35, 0x6a, 0xd4, 0xb5, 0x77, 0xee, 0xc1, 0x9f, 0x23, 0x46, 0x8c, 0x05, 0x0a, 0x14, 0x28, 0x50, 0xa0, 0x5d, 0xba, 0x69, 0xd2, 0xb9, 0x6f, 0xde, 0xa1, 0x5f, 0xbe, 0x61, 0xc2, 0x99, 0x2f, 0x5e, 0xbc, 0x65, 0xca, 0x89, 0x0f, 0x1e, 0x3c, 0x78, 0xf0, 0xfd, 0xe7, 0xd3, 0xbb, 0x6b, 0xd6, 0xb1, 0x7f, 0xfe, 0xe1, 0xdf, 0xa3, 0x5b, 0xb6, 0x71, 0xe2, 0xd9, 0xaf, 0x43, 0x86, 0x11, 0x22, 0x44, 0x88, 0x0d, 0x1a, 0x34, 0x68, 0xd0, 0xbd, 0x67, 0xce, 0x81, 0x1f, 0x3e, 0x7c, 0xf8, 0xed, 0xc7, 0x93, 0x3b, 0x76, 0xec, 0xc5, 0x97, 0x33, 0x66, 0xcc, 0x85, 0x17, 0x2e, 0x5c, 0xb8, 0x6d, 0xda, 0xa9, 0x4f, 0x9e, 0x21, 0x42, 0x84, 0x15, 0x2a, 0x54, 0xa8, 0x4d, 0x9a, 0x29, 0x52, 0xa4, 0x55, 0xaa, 0x49, 0x92, 0x39, 0x72, 0xe4, 0xd5, 0xb7, 0x73, 0xe6, 0xd1, 0xbf, 0x63, 0xc6, 0x91, 0x3f, 0x7e, 0xfc, 0xe5, 0xd7, 0xb3, 0x7b, 0xf6, 0xf1, 0xff, 0xe3, 0xdb, 0xab, 0x4b, 0x96, 0x31, 0x62, 0xc4, 0x95, 0x37, 0x6e, 0xdc, 0xa5, 0x57, 0xae, 0x41, 0x82, 0x19, 0x32, 0x64, 0xc8, 0x8d, 0x07, 0x0e, 0x1c, 0x38, 0x70, 0xe0, 0xdd, 0xa7, 0x53, 0xa6, 0x51, 0xa2, 0x59, 0xb2, 0x79, 0xf2, 0xf9, 0xef, 0xc3, 0x9b, 0x2b, 0x56, 0xac, 0x45, 0x8a, 0x09, 0x12, 0x24, 0x48, 0x90, 0x3d, 0x7a, 0xf4, 0xf5, 0xf7, 0xf3, 0xfb, 0xeb, 0xcb, 0x8b, 0x0b, 0x16, 0x2c, 0x58, 0xb0, 0x7d, 0xfa, 0xe9, 0xcf, 0x83, 0x1b, 0x36, 0x6c, 0xd8, 0xad, 0x47, 0x8e, 0x00];

  // Working buffers:
  // data input and ecc append, image working buffer, fixed part of image, run lengths for badness
  var strinbuf = [],
      eccbuf = [],
      qrframe = [],
      framask = [],
      rlens = [];
  // Control values - width is based on version, last 4 are from table.
  var version, width, neccblk1, neccblk2, datablkw, eccblkwid;
  var ecclevel = 2;
  // set bit to indicate cell in qrframe is immutable.  symmetric around diagonal
  function setmask(x, y) {
    var bt;
    if (x > y) {
      bt = x;
      x = y;
      y = bt;
    }
    // y*y = 1+3+5...
    bt = y;
    bt *= y;
    bt += y;
    bt >>= 1;
    bt += x;
    framask[bt] = 1;
  }

  // enter alignment pattern - black to qrframe, white to mask (later black frame merged to mask)
  function putalign(x, y) {
    var j;

    qrframe[x + width * y] = 1;
    for (j = -2; j < 2; j++) {
      qrframe[x + j + width * (y - 2)] = 1;
      qrframe[x - 2 + width * (y + j + 1)] = 1;
      qrframe[x + 2 + width * (y + j)] = 1;
      qrframe[x + j + 1 + width * (y + 2)] = 1;
    }
    for (j = 0; j < 2; j++) {
      setmask(x - 1, y + j);
      setmask(x + 1, y - j);
      setmask(x - j, y - 1);
      setmask(x + j, y + 1);
    }
  }

  //========================================================================
  // Reed Solomon error correction
  // exponentiation mod N
  function modnn(x) {
    while (x >= 255) {
      x -= 255;
      x = (x >> 8) + (x & 255);
    }
    return x;
  }

  var genpoly = [];

  // Calculate and append ECC data to data block.  Block is in strinbuf, indexes to buffers given.
  function appendrs(data, dlen, ecbuf, eclen) {
    var i, j, fb;

    for (i = 0; i < eclen; i++) {
      strinbuf[ecbuf + i] = 0;
    }for (i = 0; i < dlen; i++) {
      fb = glog[strinbuf[data + i] ^ strinbuf[ecbuf]];
      if (fb != 255) /* fb term is non-zero */
        for (j = 1; j < eclen; j++) {
          strinbuf[ecbuf + j - 1] = strinbuf[ecbuf + j] ^ gexp[modnn(fb + genpoly[eclen - j])];
        } else for (j = ecbuf; j < ecbuf + eclen; j++) {
        strinbuf[j] = strinbuf[j + 1];
      }strinbuf[ecbuf + eclen - 1] = fb == 255 ? 0 : gexp[modnn(fb + genpoly[0])];
    }
  }

  //========================================================================
  // Frame data insert following the path rules

  // check mask - since symmetrical use half.
  function ismasked(x, y) {
    var bt;
    if (x > y) {
      bt = x;
      x = y;
      y = bt;
    }
    bt = y;
    bt += y * y;
    bt >>= 1;
    bt += x;
    return framask[bt];
  }

  //========================================================================
  //  Apply the selected mask out of the 8.
  function applymask(m) {
    var x, y, r3x, r3y;

    switch (m) {
      case 0:
        for (y = 0; y < width; y++) {
          for (x = 0; x < width; x++) {
            if (!(x + y & 1) && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }break;
      case 1:
        for (y = 0; y < width; y++) {
          for (x = 0; x < width; x++) {
            if (!(y & 1) && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }break;
      case 2:
        for (y = 0; y < width; y++) {
          for (r3x = 0, x = 0; x < width; x++, r3x++) {
            if (r3x == 3) r3x = 0;
            if (!r3x && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }break;
      case 3:
        for (r3y = 0, y = 0; y < width; y++, r3y++) {
          if (r3y == 3) r3y = 0;
          for (r3x = r3y, x = 0; x < width; x++, r3x++) {
            if (r3x == 3) r3x = 0;
            if (!r3x && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }
        break;
      case 4:
        for (y = 0; y < width; y++) {
          for (r3x = 0, r3y = y >> 1 & 1, x = 0; x < width; x++, r3x++) {
            if (r3x == 3) {
              r3x = 0;
              r3y = !r3y;
            }
            if (!r3y && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }break;
      case 5:
        for (r3y = 0, y = 0; y < width; y++, r3y++) {
          if (r3y == 3) r3y = 0;
          for (r3x = 0, x = 0; x < width; x++, r3x++) {
            if (r3x == 3) r3x = 0;
            if (!((x & y & 1) + !(!r3x | !r3y)) && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }
        break;
      case 6:
        for (r3y = 0, y = 0; y < width; y++, r3y++) {
          if (r3y == 3) r3y = 0;
          for (r3x = 0, x = 0; x < width; x++, r3x++) {
            if (r3x == 3) r3x = 0;
            if (!((x & y & 1) + (r3x && r3x == r3y) & 1) && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }
        break;
      case 7:
        for (r3y = 0, y = 0; y < width; y++, r3y++) {
          if (r3y == 3) r3y = 0;
          for (r3x = 0, x = 0; x < width; x++, r3x++) {
            if (r3x == 3) r3x = 0;
            if (!((r3x && r3x == r3y) + (x + y & 1) & 1) && !ismasked(x, y)) qrframe[x + y * width] ^= 1;
          }
        }
        break;
    }
    return;
  }

  // Badness coefficients.
  var N1 = 3,
      N2 = 3,
      N3 = 40,
      N4 = 10;

  // Using the table of the length of each run, calculate the amount of bad image 
  // - long runs or those that look like finders; called twice, once each for X and Y
  function badruns(length) {
    var i;
    var runsbad = 0;
    for (i = 0; i <= length; i++) {
      if (rlens[i] >= 5) runsbad += N1 + rlens[i] - 5;
    } // BwBBBwB as in finder
    for (i = 3; i < length - 1; i += 2) {
      if (rlens[i - 2] == rlens[i + 2] && rlens[i + 2] == rlens[i - 1] && rlens[i - 1] == rlens[i + 1] && rlens[i - 1] * 3 == rlens[i]
      // white around the black pattern? Not part of spec
      && (rlens[i - 3] == 0 // beginning
      || i + 3 > length // end
      || rlens[i - 3] * 3 >= rlens[i] * 4 || rlens[i + 3] * 3 >= rlens[i] * 4)) runsbad += N3;
    }return runsbad;
  }

  // Calculate how bad the masked image is - blocks, imbalance, runs, or finders.
  function badcheck() {
    var x, y, h, b, b1;
    var thisbad = 0;
    var bw = 0;

    // blocks of same color.
    for (y = 0; y < width - 1; y++) {
      for (x = 0; x < width - 1; x++) {
        if (qrframe[x + width * y] && qrframe[x + 1 + width * y] && qrframe[x + width * (y + 1)] && qrframe[x + 1 + width * (y + 1)] || // all black
        !(qrframe[x + width * y] || qrframe[x + 1 + width * y] || qrframe[x + width * (y + 1)] || qrframe[x + 1 + width * (y + 1)])) // all white
          thisbad += N2;
      }
    } // X runs
    for (y = 0; y < width; y++) {
      rlens[0] = 0;
      for (h = b = x = 0; x < width; x++) {
        if ((b1 = qrframe[x + width * y]) == b) rlens[h]++;else rlens[++h] = 1;
        b = b1;
        bw += b ? 1 : -1;
      }
      thisbad += badruns(h);
    }

    // black/white imbalance
    if (bw < 0) bw = -bw;

    var big = bw;
    var count = 0;
    big += big << 2;
    big <<= 1;
    while (big > width * width) {
      big -= width * width, count++;
    }thisbad += count * N4;

    // Y runs
    for (x = 0; x < width; x++) {
      rlens[0] = 0;
      for (h = b = y = 0; y < width; y++) {
        if ((b1 = qrframe[x + width * y]) == b) rlens[h]++;else rlens[++h] = 1;
        b = b1;
      }
      thisbad += badruns(h);
    }
    return thisbad;
  }

  function genframe(instring) {
    var x, y, k, t, v, i, j, m;

    // find the smallest version that fits the string
    t = instring.length;
    version = 0;
    do {
      version++;
      k = (ecclevel - 1) * 4 + (version - 1) * 16;
      neccblk1 = eccblocks[k++];
      neccblk2 = eccblocks[k++];
      datablkw = eccblocks[k++];
      eccblkwid = eccblocks[k];
      k = datablkw * (neccblk1 + neccblk2) + neccblk2 - 3 + (version <= 9);
      if (t <= k) break;
    } while (version < 40);

    // FIXME - insure that it fits insted of being truncated
    width = 17 + 4 * version;

    // allocate, clear and setup data structures
    v = datablkw + (datablkw + eccblkwid) * (neccblk1 + neccblk2) + neccblk2;
    for (t = 0; t < v; t++) {
      eccbuf[t] = 0;
    }strinbuf = instring.slice(0);

    for (t = 0; t < width * width; t++) {
      qrframe[t] = 0;
    }for (t = 0; t < (width * (width + 1) + 1) / 2; t++) {
      framask[t] = 0;
    } // insert finders - black to frame, white to mask
    for (t = 0; t < 3; t++) {
      k = 0;
      y = 0;
      if (t == 1) k = width - 7;
      if (t == 2) y = width - 7;
      qrframe[y + 3 + width * (k + 3)] = 1;
      for (x = 0; x < 6; x++) {
        qrframe[y + x + width * k] = 1;
        qrframe[y + width * (k + x + 1)] = 1;
        qrframe[y + 6 + width * (k + x)] = 1;
        qrframe[y + x + 1 + width * (k + 6)] = 1;
      }
      for (x = 1; x < 5; x++) {
        setmask(y + x, k + 1);
        setmask(y + 1, k + x + 1);
        setmask(y + 5, k + x);
        setmask(y + x + 1, k + 5);
      }
      for (x = 2; x < 4; x++) {
        qrframe[y + x + width * (k + 2)] = 1;
        qrframe[y + 2 + width * (k + x + 1)] = 1;
        qrframe[y + 4 + width * (k + x)] = 1;
        qrframe[y + x + 1 + width * (k + 4)] = 1;
      }
    }

    // alignment blocks
    if (version > 1) {
      t = adelta[version];
      y = width - 7;
      for (;;) {
        x = width - 7;
        while (x > t - 3) {
          putalign(x, y);
          if (x < t) break;
          x -= t;
        }
        if (y <= t + 9) break;
        y -= t;
        putalign(6, y);
        putalign(y, 6);
      }
    }

    // single black
    qrframe[8 + width * (width - 8)] = 1;

    // timing gap - mask only
    for (y = 0; y < 7; y++) {
      setmask(7, y);
      setmask(width - 8, y);
      setmask(7, y + width - 7);
    }
    for (x = 0; x < 8; x++) {
      setmask(x, 7);
      setmask(x + width - 8, 7);
      setmask(x, width - 8);
    }

    // reserve mask-format area
    for (x = 0; x < 9; x++) {
      setmask(x, 8);
    }for (x = 0; x < 8; x++) {
      setmask(x + width - 8, 8);
      setmask(8, x);
    }
    for (y = 0; y < 7; y++) {
      setmask(8, y + width - 7);
    } // timing row/col
    for (x = 0; x < width - 14; x++) {
      if (x & 1) {
        setmask(8 + x, 6);
        setmask(6, 8 + x);
      } else {
        qrframe[8 + x + width * 6] = 1;
        qrframe[6 + width * (8 + x)] = 1;
      }
    } // version block
    if (version > 6) {
      t = vpat[version - 7];
      k = 17;
      for (x = 0; x < 6; x++) {
        for (y = 0; y < 3; y++, k--) {
          if (1 & (k > 11 ? version >> k - 12 : t >> k)) {
            qrframe[5 - x + width * (2 - y + width - 11)] = 1;
            qrframe[2 - y + width - 11 + width * (5 - x)] = 1;
          } else {
            setmask(5 - x, 2 - y + width - 11);
            setmask(2 - y + width - 11, 5 - x);
          }
        }
      }
    }

    // sync mask bits - only set above for white spaces, so add in black bits
    for (y = 0; y < width; y++) {
      for (x = 0; x <= y; x++) {
        if (qrframe[x + width * y]) setmask(x, y);
      }
    } // convert string to bitstream
    // 8 bit data to QR-coded 8 bit data (numeric or alphanum, or kanji not supported)
    v = strinbuf.length;

    // string to array
    for (i = 0; i < v; i++) {
      eccbuf[i] = strinbuf.charCodeAt(i);
    }strinbuf = eccbuf.slice(0);

    // calculate max string length
    x = datablkw * (neccblk1 + neccblk2) + neccblk2;
    if (v >= x - 2) {
      v = x - 2;
      if (version > 9) v--;
    }

    // shift and repack to insert length prefix
    i = v;
    if (version > 9) {
      strinbuf[i + 2] = 0;
      strinbuf[i + 3] = 0;
      while (i--) {
        t = strinbuf[i];
        strinbuf[i + 3] |= 255 & t << 4;
        strinbuf[i + 2] = t >> 4;
      }
      strinbuf[2] |= 255 & v << 4;
      strinbuf[1] = v >> 4;
      strinbuf[0] = 0x40 | v >> 12;
    } else {
      strinbuf[i + 1] = 0;
      strinbuf[i + 2] = 0;
      while (i--) {
        t = strinbuf[i];
        strinbuf[i + 2] |= 255 & t << 4;
        strinbuf[i + 1] = t >> 4;
      }
      strinbuf[1] |= 255 & v << 4;
      strinbuf[0] = 0x40 | v >> 4;
    }
    // fill to end with pad pattern
    i = v + 3 - (version < 10);
    while (i < x) {
      strinbuf[i++] = 0xec;
      // buffer has room    if (i == x)      break;
      strinbuf[i++] = 0x11;
    }

    // calculate and append ECC

    // calculate generator polynomial
    genpoly[0] = 1;
    for (i = 0; i < eccblkwid; i++) {
      genpoly[i + 1] = 1;
      for (j = i; j > 0; j--) {
        genpoly[j] = genpoly[j] ? genpoly[j - 1] ^ gexp[modnn(glog[genpoly[j]] + i)] : genpoly[j - 1];
      }genpoly[0] = gexp[modnn(glog[genpoly[0]] + i)];
    }
    for (i = 0; i <= eccblkwid; i++) {
      genpoly[i] = glog[genpoly[i]];
    } // use logs for genpoly[] to save calc step

    // append ecc to data buffer
    k = x;
    y = 0;
    for (i = 0; i < neccblk1; i++) {
      appendrs(y, datablkw, k, eccblkwid);
      y += datablkw;
      k += eccblkwid;
    }
    for (i = 0; i < neccblk2; i++) {
      appendrs(y, datablkw + 1, k, eccblkwid);
      y += datablkw + 1;
      k += eccblkwid;
    }
    // interleave blocks
    y = 0;
    for (i = 0; i < datablkw; i++) {
      for (j = 0; j < neccblk1; j++) {
        eccbuf[y++] = strinbuf[i + j * datablkw];
      }for (j = 0; j < neccblk2; j++) {
        eccbuf[y++] = strinbuf[neccblk1 * datablkw + i + j * (datablkw + 1)];
      }
    }
    for (j = 0; j < neccblk2; j++) {
      eccbuf[y++] = strinbuf[neccblk1 * datablkw + i + j * (datablkw + 1)];
    }for (i = 0; i < eccblkwid; i++) {
      for (j = 0; j < neccblk1 + neccblk2; j++) {
        eccbuf[y++] = strinbuf[x + i + j * eccblkwid];
      }
    }strinbuf = eccbuf;

    // pack bits into frame avoiding masked area.
    x = y = width - 1;
    k = v = 1; // up, minus
    /* inteleaved data and ecc codes */
    m = (datablkw + eccblkwid) * (neccblk1 + neccblk2) + neccblk2;
    for (i = 0; i < m; i++) {
      t = strinbuf[i];
      for (j = 0; j < 8; j++, t <<= 1) {
        if (0x80 & t) qrframe[x + width * y] = 1;
        do {
          // find next fill position
          if (v) x--;else {
            x++;
            if (k) {
              if (y != 0) y--;else {
                x -= 2;
                k = !k;
                if (x == 6) {
                  x--;
                  y = 9;
                }
              }
            } else {
              if (y != width - 1) y++;else {
                x -= 2;
                k = !k;
                if (x == 6) {
                  x--;
                  y -= 8;
                }
              }
            }
          }
          v = !v;
        } while (ismasked(x, y));
      }
    }

    // save pre-mask copy of frame
    strinbuf = qrframe.slice(0);
    t = 0; // best
    y = 30000; // demerit
    // for instead of while since in original arduino code
    // if an early mask was "good enough" it wouldn't try for a better one
    // since they get more complex and take longer.
    for (k = 0; k < 8; k++) {
      applymask(k); // returns black-white imbalance
      x = badcheck();
      if (x < y) {
        // current mask better than previous best?
        y = x;
        t = k;
      }
      if (t == 7) break; // don't increment i to a void redoing mask
      qrframe = strinbuf.slice(0); // reset for next pass
    }
    if (t != k) // redo best mask - none good enough, last wasn't t
      applymask(t);

    // add in final mask/ecclevel bytes
    y = fmtword[t + (ecclevel - 1 << 3)];
    // low byte
    for (k = 0; k < 8; k++, y >>= 1) {
      if (y & 1) {
        qrframe[width - 1 - k + width * 8] = 1;
        if (k < 6) qrframe[8 + width * k] = 1;else qrframe[8 + width * (k + 1)] = 1;
      }
    } // high byte
    for (k = 0; k < 7; k++, y >>= 1) {
      if (y & 1) {
        qrframe[8 + width * (width - 7 + k)] = 1;
        if (k) qrframe[6 - k + width * 8] = 1;else qrframe[7 + width * 8] = 1;
      }
    }return qrframe;
  }

  var _canvas = null;

  var api = {

    get ecclevel() {
      return ecclevel;
    },

    set ecclevel(val) {
      ecclevel = val;
    },

    get size() {
      return _size;
    },

    set size(val) {
      _size = val;
    },

    get canvas() {
      return _canvas;
    },

    set canvas(el) {
      _canvas = el;
    },

    getFrame: function getFrame(string) {
      return genframe(string);
    },
    //这里的utf16to8(str)是对Text中的字符串进行转码，让其支持中文
    utf16to8: function utf16to8(str) {
      var out, i, len, c;

      out = "";
      len = str.length;
      for (i = 0; i < len; i++) {
        c = str.charCodeAt(i);
        if (c >= 0x0001 && c <= 0x007F) {
          out += str.charAt(i);
        } else if (c > 0x07FF) {
          out += String.fromCharCode(0xE0 | c >> 12 & 0x0F);
          out += String.fromCharCode(0x80 | c >> 6 & 0x3F);
          out += String.fromCharCode(0x80 | c >> 0 & 0x3F);
        } else {
          out += String.fromCharCode(0xC0 | c >> 6 & 0x1F);
          out += String.fromCharCode(0x80 | c >> 0 & 0x3F);
        }
      }
      return out;
    },
    /**
     * 新增$this参数，传入组件的this,兼容在组件中生成
     * @param bg 目前只能设置颜色值
     */
    draw: function draw(str, ctx, startX, startY, cavW, cavH, bg, color, $this, ecc) {
      var that = this;
      ecclevel = ecc || ecclevel;
      if (!ctx) {
        console.warn('No canvas provided to draw QR code in!');
        return;
      }
      var size = Math.min(cavW, cavH);
      str = that.utf16to8(str); //增加中文显示

      var frame = that.getFrame(str);
      var px = size / width;
      if (bg) {
        ctx.setFillStyle(bg);
        ctx.fillRect(startX, startY, cavW, cavW);
      }
      ctx.setFillStyle(color || 'black');
      for (var i = 0; i < width; i++) {
        for (var j = 0; j < width; j++) {
          if (frame[j * width + i]) {
            ctx.fillRect(startX + px * i, startY + px * j, px, px);
          }
        }
      }
    }
  };
  module.exports = { api: api
    // exports.draw = api;

  };
}();

/***/ }),

/***/ "./src/components/painter/lib/util.js":
/*!********************************************!*\
  !*** ./src/components/painter/lib/util.js ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function isValidUrl(url) {
  return (/(ht|f)tp(s?):\/\/([^ \\/]*\.)+[^ \\/]*(:[0-9]+)?\/?/.test(url)
  );
}

/**
 * 深度对比两个对象是否一致
 * from: https://github.com/epoberezkin/fast-deep-equal
 * @param  {Object} a 对象a
 * @param  {Object} b 对象b
 * @return {Boolean}   是否相同
 */
/* eslint-disable */
function equal(a, b) {
  if (a === b) return true;

  if (a && b && (typeof a === 'undefined' ? 'undefined' : _typeof(a)) == 'object' && (typeof b === 'undefined' ? 'undefined' : _typeof(b)) == 'object') {
    var arrA = Array.isArray(a),
        arrB = Array.isArray(b),
        i,
        length,
        key;

    if (arrA && arrB) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;) {
        if (!equal(a[i], b[i])) return false;
      }return true;
    }

    if (arrA != arrB) return false;

    var dateA = a instanceof Date,
        dateB = b instanceof Date;
    if (dateA != dateB) return false;
    if (dateA && dateB) return a.getTime() == b.getTime();

    var regexpA = a instanceof RegExp,
        regexpB = b instanceof RegExp;
    if (regexpA != regexpB) return false;
    if (regexpA && regexpB) return a.toString() == b.toString();

    var keys = Object.keys(a);
    length = keys.length;

    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    }for (i = length; i-- !== 0;) {
      key = keys[i];
      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  return a !== a && b !== b;
}

module.exports = {
  isValidUrl: isValidUrl,
  equal: equal
};

/***/ }),

/***/ "./src/components/painter/painter.js":
/*!*******************************************!*\
  !*** ./src/components/painter/painter.js ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _pen = __webpack_require__(/*! ./lib/pen */ "./src/components/painter/lib/pen.js");

var _pen2 = _interopRequireDefault(_pen);

var _downloader = __webpack_require__(/*! ./lib/downloader */ "./src/components/painter/lib/downloader.js");

var _downloader2 = _interopRequireDefault(_downloader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var util = __webpack_require__(/*! ./lib/util */ "./src/components/painter/lib/util.js");

var downloader = new _downloader2.default();

// 最大尝试的绘制次数
var MAX_PAINT_COUNT = 5;
Component({
  canvasWidthInPx: 0,
  canvasHeightInPx: 0,
  paintCount: 0,
  /**
   * 组件的属性列表
   */
  properties: {
    customStyle: {
      type: String
    },
    palette: {
      type: Object,
      observer: function observer(newVal, oldVal) {
        if (this.isNeedRefresh(newVal, oldVal)) {
          this.paintCount = 0;
          this.startPaint();
        }
      }
    },
    widthPixels: {
      type: Number,
      value: 0
    },
    // 启用脏检查，默认 false
    dirty: {
      type: Boolean,
      value: false
    }
  },

  data: {
    picURL: '',
    showCanvas: true,
    painterStyle: ''
  },

  methods: {
    /**
     * 判断一个 object 是否为 空
     * @param {object} object
     */
    isEmpty: function isEmpty(object) {
      for (var i in object) {
        return false;
      }
      return true;
    },
    isNeedRefresh: function isNeedRefresh(newVal, oldVal) {
      if (!newVal || this.isEmpty(newVal) || this.data.dirty && util.equal(newVal, oldVal)) {
        return false;
      }
      return true;
    },
    startPaint: function startPaint() {
      var _this = this;

      if (this.isEmpty(this.properties.palette)) {
        return;
      }

      if (!(getApp().systemInfo && getApp().systemInfo.screenWidth)) {
        try {
          getApp().systemInfo = wx.getSystemInfoSync();
        } catch (e) {
          var error = 'Painter get system info failed, ' + JSON.stringify(e);
          that.triggerEvent('imgErr', {
            error: error
          });
          console.error(error);
          return;
        }
      }
      var screenK = getApp().systemInfo.screenWidth / 750;
      setStringPrototype(screenK, 1);

      this.downloadImages().then(function (palette) {
        var width = palette.width,
            height = palette.height;


        if (!width || !height) {
          console.error('You should set width and height correctly for painter, width: ' + width + ', height: ' + height);
          return;
        }
        _this.canvasWidthInPx = width.toPx();
        if (_this.properties.widthPixels) {
          // 如果重新设置过像素宽度，则重新设置比例
          setStringPrototype(screenK, _this.properties.widthPixels / _this.canvasWidthInPx);
          _this.canvasWidthInPx = _this.properties.widthPixels;
        }

        _this.canvasHeightInPx = height.toPx();
        _this.setData({
          painterStyle: 'width:' + _this.canvasWidthInPx + 'px;height:' + _this.canvasHeightInPx + 'px;'
        });
        var ctx = wx.createCanvasContext('k-canvas', _this);
        var pen = new _pen2.default(ctx, palette);
        pen.paint(function () {
          _this.saveImgToLocal();
        });
      });
    },
    downloadImages: function downloadImages() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        var preCount = 0;
        var completeCount = 0;
        var paletteCopy = JSON.parse(JSON.stringify(_this2.properties.palette));
        if (paletteCopy.background) {
          preCount++;
          downloader.download(paletteCopy.background).then(function (path) {
            paletteCopy.background = path;
            completeCount++;
            if (preCount === completeCount) {
              resolve(paletteCopy);
            }
          }, function () {
            completeCount++;
            if (preCount === completeCount) {
              resolve(paletteCopy);
            }
          });
        }
        if (paletteCopy.views) {
          var _loop = function _loop(view) {
            if (view && view.type === 'image' && view.url) {
              preCount++;
              /* eslint-disable no-loop-func */
              downloader.download(view.url).then(function (path) {
                view.url = path;
                wx.getImageInfo({
                  src: view.url,
                  success: function success(res) {
                    // 获得一下图片信息，供后续裁减使用
                    view.sWidth = res.width;
                    view.sHeight = res.height;
                  },
                  fail: function fail(error) {
                    // 如果图片坏了，则直接置空，防止坑爹的 canvas 画崩溃了
                    view.url = "";
                    console.error('getImageInfo ' + view.url + ' failed, ' + JSON.stringify(error));
                  },
                  complete: function complete() {
                    completeCount++;
                    if (preCount === completeCount) {
                      resolve(paletteCopy);
                    }
                  }
                });
              }, function () {
                completeCount++;
                if (preCount === completeCount) {
                  resolve(paletteCopy);
                }
              });
            }
          };

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = paletteCopy.views[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var view = _step.value;

              _loop(view);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
        if (preCount === 0) {
          resolve(paletteCopy);
        }
      });
    },
    saveImgToLocal: function saveImgToLocal() {
      var _this3 = this;

      var that = this;
      setTimeout(function () {
        wx.canvasToTempFilePath({
          canvasId: 'k-canvas',
          success: function success(res) {
            that.getImageInfo(res.tempFilePath);
          },
          fail: function fail(error) {
            console.error('canvasToTempFilePath failed, ' + JSON.stringify(error));
            that.triggerEvent('imgErr', {
              error: error
            });
          }
        }, _this3);
      }, 300);
    },
    getImageInfo: function getImageInfo(filePath) {
      var that = this;
      wx.getImageInfo({
        src: filePath,
        success: function success(infoRes) {
          if (that.paintCount > MAX_PAINT_COUNT) {
            var error = 'The result is always fault, even we tried ' + MAX_PAINT_COUNT + ' times';
            console.error(error);
            that.triggerEvent('imgErr', {
              error: error
            });
            return;
          }
          // 比例相符时才证明绘制成功，否则进行强制重绘制
          if (Math.abs((infoRes.width * that.canvasHeightInPx - that.canvasWidthInPx * infoRes.height) / (infoRes.height * that.canvasHeightInPx)) < 0.01) {
            that.triggerEvent('imgOK', {
              path: filePath
            });
          } else {
            that.startPaint();
          }
          that.paintCount++;
        },
        fail: function fail(error) {
          console.error('getImageInfo failed, ' + JSON.stringify(error));
          that.triggerEvent('imgErr', {
            error: error
          });
        }
      });
    }
  }
});

function setStringPrototype(screenK, scale) {
  /* eslint-disable no-extend-native */
  /**
   * 是否支持负数
   * @param {Boolean} minus 是否支持负数
   */
  String.prototype.toPx = function toPx(minus) {
    var reg = void 0;
    if (minus) {
      reg = /^-?[0-9]+([.]{1}[0-9]+){0,1}(rpx|px)$/g;
    } else {
      reg = /^[0-9]+([.]{1}[0-9]+){0,1}(rpx|px)$/g;
    }
    var results = reg.exec(this);
    if (!this || !results) {
      console.error('The size: ' + this + ' is illegal');
      return 0;
    }
    var unit = results[2];
    var value = parseFloat(this);

    var res = 0;
    if (unit === 'rpx') {
      res = Math.round(value * screenK * (scale || 1));
    } else if (unit === 'px') {
      res = Math.round(value * (scale || 1));
    }
    return res;
  };
}

/***/ })

},[["./src/components/painter/painter.js","runtime"]]]);