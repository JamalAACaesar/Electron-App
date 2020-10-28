//@ts-check

//imports
const path = require("path");
const url = require("url");

//deconstruct imports
const { app, BrowserWindow, Menu, ipcMain } = require("electron");

const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.join(__dirname, "data.db"), //'./data.db'
  },
  useNullAsDefault: true,
});

knex.schema.hasTable("wine").then((exists) => {
  if (!exists)
    knex.schema
      .createTable("wine", (table) => {
        table.increments("wineID").primary();
        table.string("name");
        table.string("category");
        table.string("type");
        table.integer("year");
        table.string("winery");
        table.integer("yearPurchased");
        table.integer("rating").defaultTo(1);
      })
      .then((result) => {
        console.log("CREATE TABLE RESULT =>", result);
      });
});

//variables for windows
let mainWindow;
let addWindow;
let updateWindow;

function loadData() {
  knex.schema.hasTable("wine").then((exists) => {
    if (exists)
      knex("wine").then((rows) => {
        console.log("INIT", rows.length);

        if (rows !== null && rows.length > 0) {
          setTimeout(() => {
            console.log("timeeeee");
            mainWindow.webContents.send("init", rows);
          }, 1000);
        }
      });
  });
}

//function to create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    icon: __dirname + "/32x32.png",
  });

  mainWindow.loadFile("mainwindow.html");

  mainWindow.show();
  console.log("RANNNN ✅");

  // loadData()

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('FINISHED LOADING 🟥')
    loadData()
  })

  mainWindow.on("closed", function () {
    app.quit();
  });

  ipcMain.on("item:add", function (e, item) {
    knex("wine")
      .insert(item)
      .then((result) => {
        console.log("WINE ADDED ", result);
      });

    console.log(item); //test data got here to main
    mainWindow.webContents.send(
      "item:add",
      `Bottle: ${item.name}<br/>Category: ${item.category}<br/>Type: ${item.type}<br/>Purchase: ${item.yearPurchased} </br/> Year: ${item.year}
    <br/>Winery: ${item.winery}<br/> Rating: ${item.rating}`
    );
    addWindow.close();
  });

  ipcMain.on("item:select", (e, item) => {
    createUpdateWind();
  });

  ipcMain.on("item:update", (event, { wineID, item }) => {
    updateWindow.close();

    console.log("ON UPDATE CALLED");

    knex("wine")
      .where({ wineID })
      .update(item)
      .then((result) => console.log("on Update()", result));

    clearWindow();

    loadData()
  });

  ipcMain.on("item:del", (e, wineID) => {
    knex("wine")
      .where({ wineID })
      .del()
      .then((result) => console.log("DEKLETED: ", result));
  });

  let menu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(menu);
} //end createWindow

function createUpdateWind() {
  updateWindow = new BrowserWindow({
    width: 700,
    height: 700,
    title: "Update Item",
    webPreferences: {
      nodeIntegration: true,
    },
    icon: __dirname + "/32x32.png",
  });

  updateWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "update.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  updateWindow.on("close", function () {
    addWindow = null;
  });
}

//function to create window for Adding
function createAddWindow() {
  addWindow = new BrowserWindow({
    width: 700,
    height: 700,
    title: "Add Item",
    webPreferences: {
      nodeIntegration: true,
    },
    icon: __dirname + "/32x32.png",
  });

  addWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "addwindow.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  addWindow.on("close", function () {
    addWindow = null;
  });
} //end create addWindow

function clearWindow() {
  mainWindow.webContents.send("item:clear");
} //end function clearWindow

//template for menu
const mainMenuTemplate = [
  {
    label: "File",
    submenu: [
      {
        label: "Add",
        click() {
          createAddWindow();
        },
      },
      {
        label: "Clear",
        click() {
          clearWindow();
        },
      },
      {
        label: "Quit",
        accelerator: "Ctrl+Q",
        click() {
          app.quit();
        },
      },
      {
        label: "Dev-Tools",
        accelerator: "F12",
        click(focusedWindow) {
          mainWindow.webContents.openDevTools();

          //focusedWindow.toggleDevTools();
        },
      },
      {
        role: "reload",
      },
    ],
  },
];

app.on("ready", createWindow);
