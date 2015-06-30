/**
 * <frp-control> directive
 *
 * (C) Copyright 2015 ADP, LLC
 *
 * @author      http://mflo.io
 * @version     0.0.1
 */

angular.module("frp").directive("frpControl",
  ["$compile",
   "$parse",
   "$timeout",
   function($compile,
            $parse,
            $timeout) {

  // internal state
  var luid = 0;

  // private functions

  function listenForButtonClicks($scope, $element, setter) {
    if (($element.prop("tagName") == "BUTTON")
     || (($element.prop("tagName") == "INPUT")
     && (($element.attr("type") == "button")
      || ($element.attr("type") == "submit")))) {
      var handler = function() {
        onThenOff($scope, setter);
      };
      $element.on("click", handler);
      // and we need to dump it later
      $scope.$on("$destroy", function() {
        $element.off("click", handler);
      });
    }
  }

  function makeLUID() {
    return "__frpControl__" + (++luid);
  }

  function onThenOff($scope, setter) {
    // the button goes on
    $scope.$apply(function() {
      setter($scope, true);
    });
    // then back off again at the next digest cycle
    $timeout(function() {
      setter($scope, false);
    });
  }

  // the DDO

  return {

    compile: function($element) {
      // we need to manually compile in order to jam ng-model
      if (!$element.attr("ng-model"))
        $element.attr("ng-model", makeLUID());
      var link = $compile($element, null, 2);
      // this is the link function
      return function($scope, $element, $attrs, controllers) {
        link($scope);
        // de-reference controllers
        var frpForm = controllers[0];
        var form = controllers[1];
        // if this is a button, we need a click handler
        var setter = $parse($element.attr("ng-model")).assign;
        listenForButtonClicks($scope, $element, setter);
        // create a stream to observe each change of ng-model
        // { [name]: { oldValue: value, newValue: value[, $error: { ... }] }
        var model = $element.attr("ng-model");
        var name = $element.attr("name") || model;
        var stream = $scope.$toObservable(model, true)
          .map(function(change) {
            var result = { };
            result[name] = change;
            if (!_.isEmpty(form[name].$error))
              result[name].$error = form[name].$error;
            return result;
          });
        // now call the frp-control function passing it the stream as $stream
        // NOTE: safe to do even if optional function not coded
        // NOTE: function can create a new stream
        var fn = $parse($element.attr("frp-control"));
        stream = fn($scope, { $stream: stream }) || stream;
        // register with frp-form, if available
        if (frpForm) {
          frpForm.addSetter(name, setter);
          frpForm.addStream(stream);
        }
      };
    },

    priority: 2,

    require: ["?^frpForm", "^^form"],

    restrict: "A",

    terminal: true

  };

}]);
