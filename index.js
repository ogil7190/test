const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const { initDB } = require('./db');
const { initSelf } = require('./self');
const { router, setGlobal } = require('./routes');
const { regularCheck } = require('./executor/regularExecutor');

const directory = 'screenshots';

const PORT = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.json());
app.use(router);
app.listen(PORT);
app.use('/screenshots', express.static(__dirname + '/screenshots'));

function cleanDir( directory ) {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
      
        for (const file of files) {
          fs.unlink(path.join(directory, file), err => {
            if (err) throw err;
          });
        }
    });
}

(async () => {
    try{
      if (fs.existsSync(directory)) cleanDir( directory );
      else fs.mkdirSync(directory);
    } catch(e){
      console.log( e )
    }
    await initDB();
    const global = await initSelf();
    setGlobal(global);
    regularCheck(global);
})();

console.log(`Server started at http://localhost:${PORT}`);
