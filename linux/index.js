const { exec } = require('child_process');
const debug = require('debug');
const electron = require('electron');
const windowStateKeeper = require('electron-window-state');
const mprisService = require('./lib/mprisService.js');
const registerMediaKeys = require('./lib/registerMediaKeys.js');
const { version } = require('./package');
const Positioner = require('electron-positioner');

const logger = debug('headset');
const logPlayer2Win = debug('headset:player2Win');
const logWin2Player = debug('headset:win2Player');

const {
  app,
  BrowserWindow,
  ipcMain,
} = electron;

let win;
let player;

const isDev = (process.env.NODE_ENV === 'development');

logger('Running as developer: %o', isDev);

const shouldQuit = app.makeSingleInstance(() => {
  // Someone tried to run a second instance, we should focus our window.
  logger('Second instance of Headset found');
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

const lang = 'en';

// eslint-disable-next-line
const langResource = require(`./locales/${lang}.json`);

if (shouldQuit) app.quit();

const start = () => {
  logger('Starting Headset');
  const mainWindowState = windowStateKeeper();

  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: 375,
    height: 667,
    resizable: false,
    title: 'Headset',
    maximizable: false,
    titleBarStyle: 'hiddenInset',
    icon: 'icon.png',
    frame: true,
  });

  mainWindowState.manage(win);
  if (isDev) {
    win.loadURL('http://127.0.0.1:3000');
  } else {
    win.loadURL('https://danielravina.github.io/headset/app/');
  }

  win.webContents.on('did-finish-load', () => {
    logger('Main window finished loading');
    if (player) return;

    player = new BrowserWindow({
      width: 427,
      height: 300,
      minWidth: 427,
      minHeight: 300,
      title: 'Headset - Player',
    });

    new Positioner(player).move('bottomCenter');

    if (isDev) {
      player.loadURL('http://127.0.0.1:3001');
    } else {
      player.loadURL('http://danielravina.github.io/headset/player-v2');
    }

    player.webContents.on('did-finish-load', () => {
      logger('Player window finished loading');
      win.focus();
    });

    player.on('close', (e) => {
      if (win) {
        logger('Attempted to close Player window while Headset running');
        e.preventDefault();
      } else {
        logger('Closing Player window and killing Headset');
        player = null;
        exec('kill -9 $(pgrep headset) &> /dev/null');
      }
    });

    try {
      logger('Initializing MPRIS and registering MediaKeys');
      mprisService(win, player);
      registerMediaKeys(win);
    } catch (err) {
      console.error(err);
    }

    win.webContents.executeJavaScript(`
      window.electronVersion = "v${version}"
    `);

    if (isDev) {
      win.webContents.openDevTools();
    }

    win.webContents.send('locales', lang, langResource);
  }); // end did-finish-load

  win.on('close', () => {
    logger('Closing Headset');
    win = null;
    player.close();
  });

  win.on('restore', (e) => {
    e.preventDefault();
    win.show();
  });
}; // end start

app.on('activate', () => win.show());
app.on('ready', start);

app.on('browser-window-created', (e, window) => {
  window.setMenu(null);
});

/*
 * This is the proxy between the 2 windows.
 * it receives messages from a renderrer
 * and send them to the other renderrer
 */
ipcMain.on('win2Player', (e, args) => {
  logWin2Player('%O', args);

  player.webContents.send('win2Player', args);
});

ipcMain.on('player2Win', (e, args) => {
  logPlayer2Win('%o', args);

  try {
    win.webContents.send('player2Win', args);
  } catch (err) { /* window already closed */ }
});
