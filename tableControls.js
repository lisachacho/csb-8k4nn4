/* eslint-disable no-undef*/

const makeStartYear = (beginDate) => {
  const thisYear = beginDate.getFullYear();

  const defaultOption = $("<option/>", {
    text: thisYear,
    value: thisYear,
    selected: true
  });
  defaultOption.appendTo($("#startYear"));
  $("<option/>", {
    text: thisYear + 1,
    value: thisYear + 1
  }).appendTo($("#startYear"));
  $("<option/>", {
    text: thisYear + 2,
    value: thisYear + 2
  }).appendTo($("#startYear"));
  $("<option/>", {
    text: thisYear + 3,
    value: thisYear + 3
  }).appendTo($("#startYear"));
};

const makeStartMonth = (beginDate) => {
  const thisMonth = beginDate.getMonth();
  [
    [0, "Jan"],
    [1, "Feb"],
    [2, "Mar"],
    [3, "Apr"],
    [4, "May"],
    [5, "Jun"],
    [6, "Jul"],
    [7, "Aug"],
    [8, "Sep"],
    [9, "Oct"],
    [10, "Nov"],
    [11, "Dec"]
  ].forEach(([val, month]) => {
    $("<option/>", {
      text: month,
      value: val,
      selected: val === thisMonth
    }).appendTo($("#startMonth"));
  });
};

const makeStartDay = (beginDate) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const thisDay = beginDate.getDate();
  days.forEach((day) => {
    $("<option/>", {
      text: day,
      value: day,
      selected: day === thisDay
    }).appendTo($("#startDay"));
  });
};

const makeTableControls = (beginDate) => {
  makeStartYear(beginDate);
  makeStartMonth(beginDate);
  makeStartDay(beginDate);
};
