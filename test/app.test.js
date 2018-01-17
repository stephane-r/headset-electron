const { Application } = require('spectron');
const assert = require('assert');
const path = require('path');
const robot = require('robotjs');
const delay = require('timeout-as-promise');
const helper = require('./helper.js');

let execPath = '';

if (process.platform === 'darwin') {
  execPath = 'darwin/build/Headset-darwin-x64/Headset.app/Contents/MacOS/Headset';
} else if (process.platform === 'linux') {
  execPath = 'linux/build/Headset-linux-x64/headset';
} else if (process.platform === 'win32') {
  execPath = 'windows/build/Headset-win32-ia32/headset.exe';
}

const appPath = path.join(__dirname, '..', execPath);
let app = null;

describe('application', function () {
  this.timeout(10000);

  before(() => {
    app = new Application({
      path: appPath,
      env: {
        DEBUG: 'headset*',
      },
    });
    return app.start();
  });

  after(() => app.stop());

  // Tests that both windows were created
  it('start application', () => app.client
    .waitUntilWindowLoaded().getWindowCount()
    .then(count => assert.equal(count, 2, 'Wrong number of windows'))
    .then(() => delay(2000)) // Inserts a delay so player window can minimize
    .click('.pt-control-indicator') // Agrees to Youtuve Terms of Service
    .click('.pt-button') // Continue button
    .getMainProcessLogs()
    .then(logs => helper.printLogs(logs)));

  // Test requiered so media keys can produce an output
  it('play song', () => app.client
    .click('.album-art')
    .waitForExist('.album-art')
    .click('.album-art')
    .waitForExist('.track-info')
    .getMainProcessLogs()
    .then((logs) => {
      helper.printLogs(logs);
      return assert(helper.isElement(logs, 'loadVideoById'), 'Couldn\'t play song');
    }));

  it('send play-pause key', () => Promise.resolve()
    .then(() => robot.keyTap('audio_play'))
    .then(() => delay(500))
    .then(() => app.client.getMainProcessLogs())
    .then((logs) => {
      helper.printLogs(logs);
      assert(helper.isElement(logs, 'Executing \'play-pause\' media key'), 'Media key was not received');
      return assert(helper.isElement(logs, 'pauseVideo\', null'), 'Status didn\'t change');
    }));

  it('send play-next key', () => Promise.resolve()
    .then(() => robot.keyTap('audio_next'))
    .then(() => delay(500))
    .then(() => app.client.getMainProcessLogs())
    .then((logs) => {
      helper.printLogs(logs);
      assert(helper.isElement(logs, 'Executing \'play-next\' media key'), 'Media key was not received');
      return assert(helper.isElement(logs, 'loadVideoById'), 'Status didn\'t change');
    }));

  it('send play-previous key', () => Promise.resolve()
    .then(() => robot.keyTap('audio_prev'))
    .then(() => delay(500))
    .then(() => app.client.getMainProcessLogs())
    .then((logs) => {
      helper.printLogs(logs);
      assert(helper.isElement(logs, 'Executing \'play-previous\' media key'), 'Media key was not received');
      return assert(helper.isElement(logs, 'loadVideoById'), 'Status didn\'t change');
    }));
});
