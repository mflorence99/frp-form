/**
 * <frp-form> directive
 *
 * (C) Copyright 2015 ADP, LLC
 *
 * @author      http://mflo.io
 * @version     0.0.1
 */

angular.module("frp").directive("frpForm",
  ["$parse",
   "rx",
   function($parse,
            rx) {

  // private functions

  function makeValuesStream($scope, $element) {
    var values = null;
    var obj = $parse($element.attr("values") || { })($scope);
    if (obj instanceof rx.Observable)
      values = obj;
    else {
      values = rx.Observable.create(function(observer) {
        observer.onNext(obj);
        observer.onCompleted();
      });
    }
    return values;
  }

  // the DDO

  return {

    controller: [function() {
      this.setters = { };
      this.streams = [ ];
      // register a new setter
      this.addSetter = function(name, setter) {
        this.setters[name] = setter;
      };
      // register a new stream
      this.addStream = function(stream) {
        this.streams.push(stream);
      };
    }],

    link: function($scope, $element, $attrs, controllers) {
      // de-reference controllers
      var frpForm = controllers[0];
      var parentFrpForm = controllers[1];
      // we may be passed a stream of (initial) values
      var values = makeValuesStream($scope, $element);
      values.subscribe(function(data) {
        _.forEach(data, function(value, name) {
          var setter = frpForm.setters[name];
          if (_.isObject(value))
            setter($scope, value.newValue);
          else setter($scope, value);
        });
      });
      // combine the latest change from each control into a unified form
      var stream = rx.Observable.combineLatest(frpForm.streams, function() {
        var result = { };
        _.forEach(arguments, function(argument) {
          _.extend(result, argument);
        });
        return result;
      });
      // now call the frp-form function passing it the combined as $stream
      // NOTE: safe to do even if optional function not coded
      // NOTE: function can create a new stream
      var fn = $parse($element.attr("frp-form"));
      stream = fn($scope, { $stream: stream }) || stream;
      // register with parent frp-form, if available
      if (parentFrpForm)
        parentFrpForm.addStream(stream);
    },

    require: ["frpForm", "?^^frpForm", "^form"],

    restrict: "A"

  };

}]);
