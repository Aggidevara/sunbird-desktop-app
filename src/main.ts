import { containerAPI } from 'OpenRAP/dist/api/index';
import { app, BrowserWindow } from 'electron';
import * as _ from 'lodash';
import * as path from "path";
import { frameworkAPI } from '@project-sunbird/ext-framework-server/api';
import { HTTPService } from '@project-sunbird/ext-framework-server/services/http-service'
import { logger } from '@project-sunbird/ext-framework-server/logger'
import { frameworkConfig } from './framework.config';
import express from 'express';
import * as bodyParser from 'body-parser';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: any;

const expressApp = express();
expressApp.use(bodyParser.json());


// Initialize ext framework
const framework = async () => {

  const subApp = express()
  subApp.use(bodyParser.json({ limit: '50mb' }))
  expressApp.use('/', subApp);
  return new Promise((resolve, reject) => {
    frameworkConfig.db.couchdb.url = process.env.COUCHDB_URL
    frameworkAPI
      .bootstrap(frameworkConfig, subApp).then(() => {
        resolve()
      }).catch((error: any) => {
        resolve()
      })
  });
}

// start the APP

const startApp = async () => {
  return new Promise((resolve, reject) => {
    expressApp.listen(process.env.APPLICATION_PORT, (error: any) => {
      if (error) {
        logger.error(error);
        reject(error)
      }
      else {
        logger.info("listening on " + process.env.APPLICATION_PORT);
        resolve()
      }
    })
  })
}


const bootstrapDependencies = async () => {
  //bootstrap container
  await prepareDB()
  await containerAPI.bootstrap();
  await framework();
  await startApp();

}

const checkAdminExists = () => {
  return new Promise((resolve, reject) => {
    HTTPService.head('http://admin:password@127.0.0.1:5984').subscribe(data => {
      resolve(data);
    }, err => {
      reject(err);
    })
  })
}

const prepareDB = () => {
  //TODO: need to update the DB PORT
  let data = '"password"'
  return new Promise((resolve, reject) => {
    checkAdminExists()
      .then(data => {
        resolve(data);
      }).catch(error => {
        HTTPService.put('http://localhost:5984/_node/couchdb@localhost/_config/admins/admin',
          data).subscribe(data => {
            resolve(data);
          }, err => {
            logger.error(`while creating admin credentials ${err.message}`)
            reject(err);
          })
      })
  })

}

function createWindow() {

  //splash screen

  let splash = new BrowserWindow({ width: 500, height: 500, transparent: true, frame: false, alwaysOnTop: true });
  splash.loadFile(path.join(__dirname, "..", "loading", "index.html"));

  // create admin for the database

  bootstrapDependencies().then(() => {
    setTimeout(() => {
      splash.destroy();
      win.loadURL(`http://localhost:${process.env.APPLICATION_PORT}`);
      win.show();
      win.maximize();
      // Open the DevTools.
      //win.webContents.openDevTools();
      win.focus();
    }, 5000)
  }).catch(err => {
    logger.error('unable to start the app ', err);
  })

  // Create the browser window.
  win = new BrowserWindow({
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
