/* eslint-disable no-undef*/

const makeHeaders = (predictionsTable) => {
  // first row
  const firstHeaderRow = $("<tr/>");

  $("<th/>", { text: "Date" }).appendTo(firstHeaderRow);
  [
    "1st. High Tide",
    "2nd. High Tide",
    "1st. Low Tide",
    "2nd. Low Tide"
  ].forEach((headerText) => {
    $("<th/>", { colspan: 2, text: headerText }).appendTo(firstHeaderRow);
  });

  firstHeaderRow.appendTo(predictionsTable);

  // send row
  const secondHeaderRow = $("<tr/>");
  [
    $dateInput.getFullYear(),
    "Time",
    "ft",
    "Time",
    "ft",
    "Time",
    "ft",
    "Time",
    "ft"
  ].forEach((headerText) => {
    $("<th/>", { text: headerText }).appendTo(secondHeaderRow);
  });

  secondHeaderRow.appendTo(predictionsTable);
};

const makeRowData = () => {
  const rowDict = {};

  $predictions.forEach((prediction) => {
    const datetime = new Date(prediction.t);
    // const key = datetime.toLocaleDateString("en-US").replace(/\//g, "");
    const key = `
      ${datetime.getFullYear()}
      ${datetime.getMonth()}
      ${datetime.getDate()}
    `;
    if (!rowDict[key]) {
      // date
      const date = datetime.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      rowDict[key] = {
        date: date
      };
    }
    const row = rowDict[key];

    // time
    const time = datetime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
    // feet
    const feet = (Math.round(prediction.v * 10) / 10).toFixed(1);

    // set correct column
    const rawTimeHour = datetime.getHours();
    if (rawTimeHour <= 12) {
      // this is the 1st tide
      if (prediction.type === "H") {
        // this is high tide
        row.firstHighTime = time;
        row.firstHighFeet = feet;
        if (10 <= rawTimeHour && rawTimeHour < 12) {
          row.firstHighQuality = "best";
        } else if (8 <= rawTimeHour && rawTimeHour < 10) {
          row.firstHighQuality = "secondBest";
        }
      } else {
        // this is the low tide
        row.firstLowTime = time;
        row.firstLowFeet = feet;
      }
    } else {
      // this is the 2nd tide
      if (prediction.type === "H") {
        // this is high tide
        row.secondHighTime = time;
        row.secondHighFeet = feet;
        if (12 <= rawTimeHour && rawTimeHour < 16) {
          row.secondHighQuality = "best";
        } else if (16 <= rawTimeHour && rawTimeHour < 18) {
          row.secondHighQuality = "secondBest";
        }
      } else {
        // this is the low tide
        row.secondLowTime = time;
        row.secondLowFeet = feet;
      }
    }
  });

  return rowDict;
};

const tr = () => $("<tr/>");
const td = (text, classes = "") => $("<td/>", { text: text, class: classes });

const makeTable = () => {
  const predictionsTable = $("<table/>", {
    id: "predictionsTable"
  });

  makeHeaders(predictionsTable, $dateInput);

  const rowData = makeRowData($predictions);
  console.log(rowData);

  Object.values(rowData).forEach((data) => {
    const row = tr();

    td(data.date).appendTo(row);
    td(data.firstHighTime || "--", data.firstHighQuality).appendTo(row);
    td(data.firstHighFeet || "--").appendTo(row);
    td(data.secondHighTime || "--", data.secondHighQuality).appendTo(row);
    td(data.secondHighFeet || "--").appendTo(row);
    td(data.firstLowTime || "--").appendTo(row);
    td(data.firstLowFeet || "--").appendTo(row);
    td(data.secondLowTime || "--").appendTo(row);
    td(data.secondLowFeet || "--").appendTo(row);

    row.appendTo(predictionsTable);
  });

  predictionsTable.appendTo("#tidePredictions");
};
