// Google Apps Script Backend for EventSync Scheduler
// Copy and paste this ENTIRE file into your Google Apps Script project (Code.gs).
// Make sure to Deploy as a "Web App", Execute as "Me", Access "Anyone".

const SHEETS = {
  USERS: "Users",
  EVENTS: "Events",
  REGISTRATIONS: "Registrations",
  SESSIONS: "Sessions",
  SETTINGS: "Settings",
  MESSAGES: "Messages",
  DIRECT_MESSAGES: "DirectMessages"
};

function getDb() {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {} // Ignore if not container bound

  if (!ss) {
    const props = PropertiesService.getScriptProperties();
    const id = props.getProperty("DB_ID");
    if (id) {
      try {
        ss = SpreadsheetApp.openById(id);
      } catch (e) {}
    }
    if (!ss) {
      ss = SpreadsheetApp.create("EventSync Database");
      props.setProperty("DB_ID", ss.getId());
    }
  }
  return ss;
}

function setupSheets() {
  const ss = getDb();
  if (!ss) throw new Error("Could not initialize database");

  if (!ss.getSheetByName(SHEETS.USERS)) {
    const sheet = ss.insertSheet(SHEETS.USERS);
    sheet.appendRow(["id", "fullName", "password", "role", "createdAt", "towns", "lastSeen"]);
    sheet.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEETS.EVENTS)) {
    const sheet = ss.insertSheet(SHEETS.EVENTS);
    sheet.appendRow([
      "id",
      "title",
      "date",
      "location",
      "description",
      "capacity",
      "createdBy",
      "createdAt",
    ]);
    sheet.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEETS.REGISTRATIONS)) {
    const sheet = ss.insertSheet(SHEETS.REGISTRATIONS);
    sheet.appendRow(["id", "eventId", "userId", "timestamp"]);
    sheet.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEETS.SESSIONS)) {
    const sheet = ss.insertSheet(SHEETS.SESSIONS);
    sheet.appendRow(["token", "userId", "expiresAt"]);
    sheet.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEETS.SETTINGS)) {
    const sheet = ss.insertSheet(SHEETS.SETTINGS);
    sheet.appendRow(["key", "value"]);
    sheet.appendRow(["admin_passcode", "1234"]); // Default passcode
    sheet.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEETS.MESSAGES)) {
    const sheet = ss.insertSheet(SHEETS.MESSAGES);
    sheet.appendRow(["id", "userId", "fullName", "text", "timestamp"]);
    sheet.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEETS.DIRECT_MESSAGES)) {
    const sheet = ss.insertSheet(SHEETS.DIRECT_MESSAGES);
    sheet.appendRow(["id", "fromUserId", "toUserId", "text", "timestamp"]);
    sheet.setFrozenRows(1);
  }
  return ss;
}

// Basic GET handler for diagnostic/testing when clicking the Web App URL
function doGet(e) {
  return ContentService.createTextOutput(
    "Backend is running! Use POST to send data.",
  ).setMimeType(ContentService.MimeType.TEXT);
}

// Main POST handler
function doPost(e) {
  const origin = e.parameter.origin || "*";

  try {
    setupSheets();

    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      throw new Error("No payload provided in the POST body.");
    }

    const action = payload.action;
    let data = null;

    if (action === "login") {
      data = handleLogin(payload.email, payload.password);
      return sendResponse({ success: true, data });
    } else if (action === "register") {
      data = handleRegister(payload.email, payload.password, payload.town);
      return sendResponse({ success: true, data });
    }

    const token = payload.token;
    if (!token) return sendResponse({ success: false, error: "unauthorized" });

    const userId = validateToken(token);
    if (!userId) return sendResponse({ success: false, error: "unauthorized" });

    const town = payload.town; // Optional but needed for town-specific endpoints

    switch (action) {
      case "addTownToUser":
        data = addTownToUser(payload.townToAdd, userId);
        break;
      case "getEvents":
        data = getEvents(town);
        break;
      case "addEvent":
        data = addEvent(payload.event, userId, town);
        break;
      case "deleteEvent":
        data = deleteEvent(payload.id, userId);
        break;
      case "registerForEvent":
        data = registerForEvent(payload.eventId, userId);
        break;
      case "getMembers":
        data = getMembers(town);
        break;
      case "verifyAdminPasscode":
        data = verifyAdminPasscode(payload.passcode, userId);
        break;
      case "updateAdminPasscode":
        data = updateAdminPasscode(payload.newPasscode, userId);
        break;
      case "updateUserRole":
        data = updateUserRole(payload.targetUserId, payload.newRole, userId);
        break;
      case "getMessages":
        data = getMessages(town);
        break;
      case "sendMessage":
        data = sendMessage(payload.text, userId, String(payload.fullName), town);
        break;
      case "updateProfile":
        data = updateProfile(userId, payload.fullName);
        break;
      case "heartbeat":
        data = updateHeartbeat(userId);
        break;
      case "getDirectMessages":
        data = getDirectMessages(userId, payload.targetUserId);
        break;
      case "getAllDirectMessages":
        data = getAllDirectMessages(userId);
        break;
      case "sendDirectMessage":
        data = sendDirectMessage(userId, payload.targetUserId, payload.text);
        break;
      case "pollData":
        data = pollData(userId, town);
        break;
      default:
        throw new Error("Unknown action: " + action);
    }
    return sendResponse({ success: true, data });
  } catch (error) {
    return sendResponse({ success: false, error: error.message });
  }
}

function sendResponse(responseObject) {
  // Return JSON response.
  return ContentService.createTextOutput(
    JSON.stringify(responseObject),
  ).setMimeType(ContentService.MimeType.JSON);
}

/* Auth Logic */
function handleRegister(fullName, password, town) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toLowerCase() === fullName.toLowerCase()) {
      throw new Error("Username already taken.");
    }
  }

  const userId = generateId();
  const role = data.length === 1 ? "admin" : "user";
  const townsStr = JSON.stringify(town ? [town] : []);

  sheet.appendRow([userId, fullName, password, role, new Date().toISOString(), townsStr]);
  return generateSession(userId, fullName, role, townsStr);
}

function handleLogin(fullName, password) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (
      data[i][1] &&
      data[i][1].toLowerCase() === fullName.toLowerCase() &&
      String(data[i][2]) === String(password)
    ) {
      const townsStr = data[i][5] || '[]';
      let parsed = [];
      try { parsed = JSON.parse(townsStr); } catch (e) {}
      if (!Array.isArray(parsed)) parsed = [];
      return generateSession(data[i][0], fullName, data[i][3], JSON.stringify(parsed));
    }
  }
  throw new Error("Invalid username or password");
}

function generateSession(userId, fullName, role, townsStr) {
  const token = generateId() + generateId();
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SESSIONS);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  sheet.appendRow([token, userId, expiresAt.toISOString()]);
  let towns = [];
  try {
    towns = JSON.parse(townsStr || '[]');
  } catch (e) {}
  return { token, userId, fullName, role, towns };
}

function addTownToUser(town, userId) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      let towns = [];
      try { towns = JSON.parse(data[i][5] || '[]'); } catch (e) {}
      if (!towns.includes(town)) {
        towns.push(town);
        sheet.getRange(i + 1, 6).setValue(JSON.stringify(towns));
      }
      return { success: true, towns };
    }
  }
  throw new Error("User not found");
}

function validateToken(token) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SESSIONS);
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      if (new Date(data[i][2]) > now) return data[i][1];
    }
  }
  return null;
}

/* Admin Logic */
function verifyAdminPasscode(passcode, userId) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  let actualPasscode = "1234";

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "admin_passcode") {
      actualPasscode = String(data[i][1]);
      break;
    }
  }

  if (String(passcode) === actualPasscode) {
    const usersSheet = ss.getSheetByName(SHEETS.USERS);
    const usersData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][0] === userId && usersData[i][3] !== "admin") {
        usersSheet.getRange(i + 1, 4).setValue("admin");
        break;
      }
    }
    return { success: true };
  }
  throw new Error("Invalid passcode");
}

function updateAdminPasscode(newPasscode, userId) {
  if (getUserRole(userId) !== "admin")
    throw new Error("Only admins can change the passcode");

  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "admin_passcode") {
      sheet.getRange(i + 1, 2).setValue(newPasscode);
      return { success: true };
    }
  }

  sheet.appendRow(["admin_passcode", newPasscode]);
  return { success: true };
}

function updateUserRole(targetUserId, newRole, userId) {
  if (getUserRole(userId) !== "admin")
    throw new Error("Only admins can change roles");

  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      sheet.getRange(i + 1, 4).setValue(newRole);
      return { success: true };
    }
  }
  throw new Error("User not found");
}

/* Data Logic */
function getEvents(town) {
  const ss = getDb();
  const eventsData = ss
    .getSheetByName(SHEETS.EVENTS)
    .getDataRange()
    .getValues();
  const regData = ss
    .getSheetByName(SHEETS.REGISTRATIONS)
    .getDataRange()
    .getValues();
  const usersData = ss
    .getSheetByName(SHEETS.USERS)
    .getDataRange()
    .getValues();

  const userMap = {};
  for (let i = 1; i < usersData.length; i++) {
    userMap[usersData[i][0]] = usersData[i][1];
  }

  const regCounts = {};
  const regAttendees = {};
  for (let i = 1; i < regData.length; i++) {
    const eventId = regData[i][1];
    const userId = regData[i][2];
    const name = userMap[userId] || "Unknown User";

    regCounts[eventId] = (regCounts[eventId] || 0) + 1;
    if (!regAttendees[eventId]) regAttendees[eventId] = [];
    regAttendees[eventId].push(name);
  }

  const events = [];
  for (let i = 1; i < eventsData.length; i++) {
    if (eventsData[i][8] && String(eventsData[i][8]).toLowerCase() !== String(town).toLowerCase()) {
      continue;
    }
    events.push({
      id: eventsData[i][0],
      title: eventsData[i][1],
      date: eventsData[i][2],
      location: eventsData[i][3],
      description: eventsData[i][4],
      capacity: parseInt(eventsData[i][5], 10) || 0,
      createdBy: eventsData[i][6],
      createdAt: eventsData[i][7],
      town: eventsData[i][8] || '',
      currentRegistrations: regCounts[eventsData[i][0]] || 0,
      attendees: regAttendees[eventsData[i][0]] || [],
    });
  }
  return events;
}

function addEvent(evtData, userId, town) {
  const ss = getDb();
  if (getUserRole(userId) !== "admin")
    throw new Error("Only admins can create events");

  const newId = generateId();
  ss.getSheetByName(SHEETS.EVENTS).appendRow([
    newId,
    evtData.title,
    evtData.date,
    evtData.location,
    evtData.description,
    evtData.capacity,
    userId,
    new Date().toISOString(),
    town
  ]);
  return { id: newId };
}

function deleteEvent(eventId, userId) {
  const ss = getDb();
  if (getUserRole(userId) !== "admin")
    throw new Error("Only admins can delete events");

  const sheet = ss.getSheetByName(SHEETS.EVENTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  throw new Error("Event not found");
}

function registerForEvent(eventId, userId) {
  const ss = getDb();
  const regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
  const data = regSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === eventId && data[i][2] === userId) {
      throw new Error("Already registered for this event");
    }
  }
  const newId = generateId();
  regSheet.appendRow([newId, eventId, userId, new Date().toISOString()]);
  return { id: newId };
}

function getMembers(town) {
  const ss = getDb();
  const data = ss.getSheetByName(SHEETS.USERS).getDataRange().getValues();
  const members = [];
  for (let i = 1; i < data.length; i++) {
    let townsObj = [];
    try { townsObj = JSON.parse(data[i][5] || '[]'); } catch (e) {}
    if (town && !townsObj.includes(town) && townsObj.length > 0) continue; 
    if (town && !townsObj.includes(town) && data[i][5]) continue; 
    members.push({ id: data[i][0], fullName: data[i][1], role: data[i][3], towns: townsObj, lastSeen: data[i][6] });
  }
  return members;
}

function updateProfile(userId, fullName) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i + 1, 2).setValue(fullName);
      return { success: true, fullName };
    }
  }
  throw new Error("User not found");
}

function updateHeartbeat(userId) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { success: false };
}

function getUserRole(userId) {
  const data = getDb().getSheetByName(SHEETS.USERS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) return data[i][3];
  }
  return "user";
}

/* Chat Logic */
function getMessages(town) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.MESSAGES);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // Return last 100 messages for performance
  const startRow = Math.max(2, lastRow - 99);
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 6).getValues();

  const messages = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i][5] && String(data[i][5]).toLowerCase() !== String(town).toLowerCase()) {
      continue;
    }
    messages.push({
      id: data[i][0],
      userId: data[i][1],
      fullName: data[i][2],
      text: data[i][3],
      timestamp:
        data[i][4] instanceof Date
          ? data[i][4].toISOString()
          : String(data[i][4]),
      town: data[i][5] || ''
    });
  }
  return messages;
}

function sendMessage(text, userId, fullName, town) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const ss = getDb();
    let sheet = ss.getSheetByName(SHEETS.MESSAGES);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.MESSAGES);
      sheet.appendRow(["id", "userId", "fullName", "text", "timestamp", "town"]);
      sheet.setFrozenRows(1);
    }

    const newId = generateId();
    sheet.appendRow([newId, userId, fullName, text, new Date().toISOString(), town]);
    SpreadsheetApp.flush();
    return { id: newId };
  } finally {
    lock.releaseLock();
  }
}

function getDirectMessages(userId1, userId2) {
  const ss = getDb();
  let sheet = ss.getSheetByName(SHEETS.DIRECT_MESSAGES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.DIRECT_MESSAGES);
    sheet.appendRow(["id", "fromUserId", "toUserId", "text", "timestamp"]);
    sheet.setFrozenRows(1);
  }

  const data = sheet.getDataRange().getValues();
  const messages = [];

  for (let i = 1; i < data.length; i++) {
    const fromId = data[i][1];
    const toId = data[i][2];
    if ((fromId === userId1 && toId === userId2) || (fromId === userId2 && toId === userId1)) {
      messages.push({
        id: data[i][0],
        fromUserId: fromId,
        toUserId: toId,
        text: data[i][3],
        timestamp: data[i][4] instanceof Date ? data[i][4].toISOString() : String(data[i][4])
      });
    }
  }
  return messages;
}

function getAllDirectMessages(userId) {
  const ss = getDb();
  let sheet = ss.getSheetByName(SHEETS.DIRECT_MESSAGES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.DIRECT_MESSAGES);
    sheet.appendRow(["id", "fromUserId", "toUserId", "text", "timestamp"]);
    sheet.setFrozenRows(1);
  }

  const data = sheet.getDataRange().getValues();
  const messages = [];

  for (let i = 1; i < data.length; i++) {
    const fromId = data[i][1];
    const toId = data[i][2];
    if (fromId === userId || toId === userId) {
      messages.push({
        id: data[i][0],
        fromUserId: fromId,
        toUserId: toId,
        text: data[i][3],
        timestamp: data[i][4] instanceof Date ? data[i][4].toISOString() : String(data[i][4])
      });
    }
  }
  return messages;
}

function pollData(userId, town) {
  updateHeartbeat(userId);
  return {
    events: getEvents(town),
    messages: getMessages(town),
    directMessages: getAllDirectMessages(userId),
    members: getMembers(town)
  };
}

function sendDirectMessage(userId, targetUserId, text) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const ss = getDb();
    let sheet = ss.getSheetByName(SHEETS.DIRECT_MESSAGES);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.DIRECT_MESSAGES);
      sheet.appendRow(["id", "fromUserId", "toUserId", "text", "timestamp"]);
      sheet.setFrozenRows(1);
    }

    const newId = generateId();
    sheet.appendRow([newId, userId, targetUserId, text, new Date().toISOString()]);
    SpreadsheetApp.flush();
    return { id: newId };
  } finally {
    lock.releaseLock();
  }
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
