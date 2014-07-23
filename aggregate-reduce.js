var _ = require('underscore');
var aggregateOut = require('mongo-aggregate-out');
var defaults = {ttl: 3600};

module.exports = function aggregateReduce(col, arr, map, reduce, opts, cb) {
  opts = _.defaults(opts || {}, defaults);
  var _cb = cbGuard(cb);
  var ended;
  var timer = setTimeout(function () {ended = true; _cb(new Error('TIMEDOUT'))}, (opts.ttl*1000));
  var createTemporaryCollection = require('tempcol')(col.db, {prefix: 'tmp.ar'});

  createTemporaryCollection({ttl: opts.ttl}, function (err, tempCol, dispose) {
    if (err) {clearTimeout(timer); dispose(); return _cb(err)};

    aggregateOut(col, arr, _.extend({}, opts,{
      out: tempCol.collectionName
    }), function (err) {
      if (ended) return dispose();
      if (err) {ended = true; _cb(err); return dispose();}

      tempCol.count(function (err, count) {
        if (err) {ended = true; _cb(err); return dispose();};

        if (count <= 0) {
          dispose();
          if (ended) return;
          ended = true;
          clearTimeout(timer);

          return _cb(err, opts && opts.out && opts.out.reduce && col.db.collection(opts.out.reduce) || []);
        }

        tempCol.mapReduce(map, reduce, opts, function (err, results) {
          dispose();
          if (ended) return;
          ended = true;
          clearTimeout(timer);
          _cb(err, results);
        })
      })
    })
  })
}

function cbGuard(cb) {
  var counter = 0;
  return function () {
    if (counter > 0) return;
    var args = [].slice.call(arguments);
    ++counter;
    return cb.apply(cb, args);
  }
}