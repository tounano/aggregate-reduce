# aggregate-reduce

Perform aggregate reduce operations on MongoDB.

Mongo's aggregation framework is way faster than MapReduce, however it lacks the ability to reduce aggregations incrementally.

This module adds the ability to perform aggregations and reduce it into a collection of a choice.

## Usage:

### aggregateReduce(collection, pipelineArray, map, reduce, options)

Calling this function will perform the following pipeline on the given collection:

1.  Aggregate to a temporary collection
2.  Perform MapReduce on the temporary collection.
3.  Dispose the temporary collection

Sidenote: this module uses [tempcol](https://github.com/tounano/tempcol), which handles the removal of collections even
on cases of errors.

Temporary collections would be prefixed as `tmp.ar`.

#### args

*  `collection` - The collection to perform Aggregate/Reduce on.
*  `pipelineArray` - as you would do with the aggregation framework.
*  `map` - map function, as you would do with `mapReduce`.
*  `reduce` - reduce function, as you would do with `mapReduce`.
*  `options` - options object.

#### options

*  All options that are supported in the aggregation framework, except of `out`.
*  All options that are supported in `mapReduce`
*  `ttl` - abort after X amount of seconds. (default=3600).

####Example

You can run the following example several times, it will reduce the results to `tstReduce` collection incrementally.

```js
var MongoClient = require('mongodb').MongoClient;
var aggregateReduce = require('aggregate-reduce');

MongoClient.connect('YOUR MONGO URI',{}, function (err, db) {
  if (err) return console.error(err);

  // Let's create a test data set and insert 1K rows
  var col = db.collection('test');
  var timeStamp = new Date().getTime();

  var i = 0;

  ;(function insert(){
    var d = new Date(2014, Math.round(Math.random() * 11 +1), Math.round(Math.random() * 30 +1))
    var obj = {
      date: d,
      rand: Math.round(Math.random()*100),
      timestamp: timeStamp
    }

    col.insert(obj, function (err) {
      if (err) {console.error(err); return db.close();}
      console.log('inserted', obj)

      if (++i < 1000) return insert();

      console.log('done');
      var map = function () {emit(this._id, this)};
      var reduce = function (key, values) {
        var obj = values[0];
        for (var i=1; i<values.length; ++i) {
          obj.count = (obj.count || 0) + values[i].count;
          obj.sum = (obj.sum || 0) + values[i].sum;
        }
        return obj;
      }

      aggregateReduce(col,[
        {$match: {timestamp:{$gte: timeStamp}}},
        {$group:{
          _id:{month:{$month: '$date'}, day:{$dayOfMonth:'$date'}},
          count: {$sum: 1},
          sum: {$sum: '$rand'}
        }}
      ],map, reduce, {out:{reduce: 'tstReduce'}}, function (err, col) {
        if(err) return console.error(err);
        col.find().stream().on('data', console.log);
      })
    })
  })();
});
```

## install

With [npm](https://npmjs.org) do:

```
npm install aggregate-reduce
```

## license

MIT