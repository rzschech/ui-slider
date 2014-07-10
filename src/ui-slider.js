(function (window, document) {
  'use strict';


  /**
   * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
   * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
   *
   * requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
   *
   * MIT license
   */
  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function () {
          callback(currTime + timeToCall);
        },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  }


  /**
   * UI.Slider
   */
  angular.module('ui.slider', []).value('uiSliderConfig', {})
    .controller('uiSliderController', ['$element', function uiSliderCtrl($element) {

      this.element = $element;
      this.min = 0;
      this.max = 100;
      this.step = 1;

    }])


    .directive('uiSlider', function () {
      return {
        restrict: 'EAC',
        controller: 'uiSliderController',
        compile: function (tElement) {
          if (tElement.children().length === 0) {
            // Create a default slider for design purpose.
            tElement.addClass('ui-slider-default');
            tElement.append(
              // Use a virtual scope key to allow
              '<ui-slider-thumb ng-model="__' + Math.random().toString(36).substring(7) + '"></ui-slider-thumb>'
            );
          }

          return function (scope, iElement, iAttrs, controller) {
            ////////////////////////////////////////////////////////////////////
            // OBSERVERS
            ////////////////////////////////////////////////////////////////////

            // Observe the min attr (default 0)
            iAttrs.$observe('min', function (newVal) {
              controller.min = +newVal;
              controller.min = !isNaN(controller.min) ? controller.min : 0;
              scope.$broadcast('global min changed');
            });

            // Observe the max attr (default 100)
            iAttrs.$observe('max', function (newVal) {
              controller.max = +newVal;
              controller.max = !isNaN(controller.max) ? controller.max : 100;
              scope.$broadcast('global max changed');
            });

            // Observe the step attr (default 1)
            iAttrs.$observe('step', function (newVal) {
              if (newVal === 'any') {
                controller.step = 0;
              }
              else {
                controller.step = +newVal;
                controller.step = !isNaN(controller.step) && controller.step > 0 ? controller.step : 1;
              }
              scope.$broadcast('global step changed');
            });

          };
        }
      };
    })

    .directive('uiSliderRange', function () {
      return {
        restrict: 'EAC',
        require: '^uiSlider',
        scope: { start: '@', end: '@' },
        link: function (scope, iElement, iAttrs, controller) {
          ////////////////////////////////////////////////////////////////////
          // OBSERVERS
          ////////////////////////////////////////////////////////////////////

          // Observe the start attr (default 0%)
          iAttrs.$observe('start', function (newVal) {
            var val = !isNaN(+newVal) ? +newVal : 0;
            val = (val - controller.min ) / (controller.max - controller.min) * 100;
            // TODO add half of th width of the targeted thumb ([ng-model='+ iAttrs.$attr.start + '])
            iElement.css('left', val + '%');
          });

          // Observe the min attr (default 100%)
          iAttrs.$observe('end', function (newVal) {
            // Don't display the range if no attr are specified
            var displayed = angular.isDefined(iAttrs.start) || angular.isDefined(iAttrs.end);
            var val = !isNaN(+newVal) ? +newVal : displayed ? 100 : 0;
            val = (val - controller.min ) / (controller.max - controller.min) * 100;
            // TODO add half of th width of the targeted thumb ([ng-model='+ iAttrs.$attr.end + '])
            iElement.css('right', (100 - val) + '%');
          });

        }
      };
    })

    .directive('uiSliderThumb', function () {
      // Get all the page.
      var htmlElement = angular.element(document.body.parentElement);

      return {
        restrict: 'EAC',
        require: ['^uiSlider', '?ngModel'],
        scope: {
          ngModel: '=',
          position: '@',
          decimals: '@'
        },
        template: '<div ng-if="position" class="{{position}}">{{ngModel | number:decimals}}</div>',
        link: function (scope, iElement, iAttrs, controller) {
          if (!controller[1]) return;
          var ngModel = controller[1];
          var uiSliderCtrl = controller[0];
          var animationFrameRequested;
          var _cache = {
            min: iAttrs.min ? iAttrs.min : uiSliderCtrl.min,
            max: iAttrs.max ? iAttrs.max : uiSliderCtrl.max,
            step: iAttrs.step ? iAttrs.step : uiSliderCtrl.step
          };

          ////////////////////////////////////////////////////////////////////
          // UTILS
          ////////////////////////////////////////////////////////////////////

          function _formatValue(value, min, max, step) {
            var formattedValue = value;
            if (min > max) return max;
            if (step) {
              formattedValue = Math.round(formattedValue / step) * step;
            }
            formattedValue = Math.max(Math.min(formattedValue, max), min);
            return formattedValue;
          }

          function getFormattedValue(value) {
            var formattedValue = value;
            formattedValue = _formatValue(formattedValue, _cache.min, _cache.max, _cache.step);
            return formattedValue;
          }

          function updateIfChanged(newVal, oldVal) {
            if (!angular.isUndefined(oldVal) && !isNaN(ngModel.$modelValue) && oldVal !== newVal) {
//              ngModel.$setViewValue(getFormattedValue(ngModel.$modelValue)); //breaks starting position (addition of some step value, the thumb can be slid manually back to 0% though)
              ngModel.$setViewValue(ngModel.$modelValue);
              ngModel.$render();
            }
          }

          ////////////////////////////////////////////////////////////////////
          // OBSERVERS
          ////////////////////////////////////////////////////////////////////

          // Observe the min attr (default 0)
          iAttrs.$observe('min', function observeMin(newVal) {
            var oldVal = _cache.min;
            _cache.min = +newVal;
            _cache.min = !isNaN(_cache.min) ? _cache.min : 0;

            var minSliderElem = angular.element(iElement.parent()[0].getElementsByClassName('ui-slider-thumb')[0] || iElement.parent()[0].getElementsByTagName('ui-slider-thumb')[0]);
            (_cache.min == uiSliderCtrl.max) ? minSliderElem.addClass('minAtMax') : minSliderElem.removeClass('minAtMax');

            updateIfChanged(_cache.min, oldVal);
          });
          scope.$on('global min changed', function observeGlobalMin() {
            var oldVal = _cache.min;

            _cache.min = (angular.isDefined(iAttrs.min)) ? _cache.min : uiSliderCtrl.min;
            // Secure no NaN here...
            _cache.min = !isNaN(_cache.min) ? _cache.min : 0;

            updateIfChanged(_cache.min, oldVal);
          });

          // Observe the max attr (default 100)
          iAttrs.$observe('max', function observeMax(newVal) {
            var oldVal = _cache.max;
            _cache.max = +newVal;
            _cache.max = !isNaN(_cache.max) ? _cache.max : 100;

            updateIfChanged(_cache.max, oldVal);
          });
          scope.$on('global max changed', function observeGlobalMax() {
            var oldVal = _cache.max;

            _cache.max = (angular.isDefined(iAttrs.max)) ? _cache.max : uiSliderCtrl.max;
            // Secure no NaN here...
            _cache.max = !isNaN(_cache.max) ? _cache.max : 100;

            updateIfChanged(_cache.max, oldVal);
          });

          // Observe the step attr (default 1)
          iAttrs.$observe('step', function observeStep(newVal) {
            var oldVal = _cache.step;
            if (newVal === 'any') {
              _cache.step = 0;
            }
            else {
//            _cache.step = +newVal;
              _cache.step = newVal; //fix for step breaking the min/max thumb positioning
              _cache.step = !isNaN(_cache.step) && _cache.step > 0 ? _cache.step : 1;
            }

            updateIfChanged(_cache.step, oldVal);
          });
          scope.$on('global step changed', function observeGlobalStep() {
            var oldVal = _cache.step;

            _cache.step = (angular.isDefined(iAttrs.step)) ? _cache.step : uiSliderCtrl.step;

            // Secure no NaN here...
            _cache.step = !isNaN(_cache.step) && _cache.step > 0 ? _cache.step : 1;

            updateIfChanged(_cache.step, oldVal);
          });
          ////////////////////////////////////////////////////////////////////
          // RENDERING
          ////////////////////////////////////////////////////////////////////

          ngModel.$render = function ngModelRender() {

            // Cancel previous rAF call
            if (animationFrameRequested) {
              window.cancelAnimationFrame(animationFrameRequested);
            }

            // Animate the page outside the event
            animationFrameRequested = window.requestAnimationFrame(function drawFromTheModelValue() {
              var the_thumb_pos = (ngModel.$viewValue - uiSliderCtrl.min ) / (uiSliderCtrl.max - uiSliderCtrl.min) * 100;
              iElement.css('left', the_thumb_pos + '%');
            });
          };

          ////////////////////////////////////////////////////////////////////
          // FORMATTING
          ////////////////////////////////////////////////////////////////////
          // Final view format
          ngModel.$formatters.push(function (value) {
            return +value;
          });

          // Checks that it's on the step
          ngModel.$parsers.push(function stepParser(value) {
            ngModel.$setValidity('step', true);
//            return Math.round(value / _cache.step) * _cache.step; //this breaks the starting number of the min thumb (adds some degree of step to it)
            return value;
          });
          ngModel.$formatters.push(function stepValidator(value) {
//            if (!ngModel.$isEmpty(value) && value !== Math.round(value / _cache.step) * _cache.step) {
            if (!ngModel.$isEmpty(value) && value !== value) {
              ngModel.$setValidity('step', false);
              return undefined;
            } else {
              ngModel.$setValidity('step', true);
              return value;
            }
          });

          // Checks that it's less then the maximum
          ngModel.$parsers.push(function maxParser(value) {
            ngModel.$setValidity('max', true);
            return Math.min(value, _cache.max);
          });
          ngModel.$formatters.push(function maxValidator(value) {
            if (!ngModel.$isEmpty(value) && value > _cache.max) {
              ngModel.$setValidity('max', false);
              return undefined;
            } else {
              ngModel.$setValidity('max', true);
              return value;
            }
          });

          // Checks that it's more then the minimum
          ngModel.$parsers.push(function minParser(value) {
            ngModel.$setValidity('min', true);
            return Math.max(value, _cache.min);
          });
          ngModel.$formatters.push(function minValidator(value) {
            if (!ngModel.$isEmpty(value) && value < _cache.min) {
              ngModel.$setValidity('min', false);
              return undefined;
            } else {
              ngModel.$setValidity('min', true);
              return value;
            }
          });


          // First check that a number is used
          ngModel.$formatters.push(function numberValidator(value) {
            if (ngModel.$isEmpty(value) || angular.isNumber(value)) {
              ngModel.$setValidity('number', true);
              return value;
            } else {
              ngModel.$setValidity('number', false);
              return undefined;
            }
          });
          ////////////////////////////////////////////////////////////////////
          // USER EVENT BINDING
          ////////////////////////////////////////////////////////////////////

          var hasMultipleThumb = iElement.parent()[0].getElementsByClassName('ui-slider-thumb').length;
          hasMultipleThumb += iElement.parent()[0].getElementsByTagName('ui-slider-thumb').length;
          //TODO add attribute name "[ui-slider-thumb]" ...
          hasMultipleThumb = hasMultipleThumb > 1;

          // Bind the click on the bar then you can move it all over the page.
          if (!hasMultipleThumb) {
            uiSliderCtrl.element.on('mousedown touchstart', function (e) {
              e.preventDefault();
              e.stopPropagation();
              _handleMouseEvent(e); // Handle simple click
              htmlElement.bind('mousemove touchmove', _handleMouseEvent);
              return false;
            });
          } else {
            iElement.on('mousedown touchstart', function (e) {
              e.preventDefault();
              e.stopPropagation();
              htmlElement.bind('mousemove touchmove', _handleMouseEvent);
              return false;
            });
          }
          htmlElement.on('mouseup touchend', function () {
            // Don't preventDefault and stopPropagation
            // The html element needs to be free of doing anything !
            htmlElement.unbind('mousemove touchmove');
          });

          function _cached_layout_values() {

            if (_cache.time && +new Date() < _cache.time + 1000) {
              return;
            } // after ~60 frames

            // track bounding box
            var track_bb = iElement.parent()[0].getBoundingClientRect();

            _cache.time = +new Date();
            _cache.trackOrigine = track_bb.left;
            _cache.trackSize = track_bb.width;
          }

          function _handleMouseEvent(mouseEvent) {
            // Store the mouse position for later
            _cache.lastPos = mouseEvent.clientX;

            _cached_layout_values();

            var the_thumb_value = uiSliderCtrl.min + (_cache.lastPos - _cache.trackOrigine) / _cache.trackSize * (uiSliderCtrl.max - uiSliderCtrl.min);
            the_thumb_value = getFormattedValue(the_thumb_value);

            ngModel.$setViewValue(parseFloat(the_thumb_value.toFixed(5)));
            if (!scope.$root.$$phase) {
              scope.$root.$apply();
            }
            ngModel.$render();
          }

        }
      };
    })
  ;


}(window, document));
