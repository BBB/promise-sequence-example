import Xray from 'x-ray';
import fs from 'fs';

const xray = Xray();

const urlsToGet = fs.readFileSync('./topsites.txt').toString('utf8').split(/\r?\n|\r/).slice(0, 10);

const urlPromiseSequence = promiseSeq(urlsToGet, ( url, ix ) => {
  console.log('\tStarting', url);
  return xrayPromise(`http://${ url }`, 'h1')
  .then(( result ) => {
    console.log('\tFinished', url, '-', JSON.stringify(result));
    return result;
  })
  .catch(( err ) => {
    // We want errors in this dataset to fail silently
    // this is because some sites may only accept https
    // or perhaps be down.
    // Normally you would want to handle this
    return null;
  });
});

urlPromiseSequence
.then(console.log.bind(console))
.catch(( err ) => console.error(`ERROR: ${ err.message }\n${ err.stack }`));

//
// Helpers
//

// Wrap the standard xray function so that it returns a promise
function xrayPromise(...args) {
  return new Promise(( resolve, reject ) => {
    xray(...args)(( err, obj ) => {
      if ( err ) {
        return reject(err);
      }
      return resolve(obj);
    });
  });
}

// split the array into smaller arrays,
// process each of the smaller arrays before moving
// onto the next
function promiseSeq( arr, predicate, consecutive=10 ) {
  return chunkArray(arr, consecutive).reduce(( prom, items, ix ) => {
    // wait for the previous Promise.all() to resolve
    return prom.then(( results ) => {
      console.log('\nSET', ix);
      return Promise.all(
        items.map(( item ) => {
          return predicate(item, ix)
        })
      )
      .then(( results ) => {
        return results.concat(results);
      });
    });
  }, Promise.resolve([]));

  function chunkArray( startArray, chunkSize ) {
    let j = -1;
    return startArray.reduce(( arr, item, ix ) => {
      j += ix % chunkSize === 0 ? 1 : 0;
      arr[ j ] = [
        ...( arr[ j ] || []),
        item,
      ];
      return arr;
    }, []);
  }
}
