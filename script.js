/* eslint-disable no-undef*/

$(document).ready(function () {
  $dateInput = new Date();
  loadData();
  makeTableControls($dateInput);

  $("#getTideTable").click(() => {
    const year = $("#startYear").val();
    const month = $("#startMonth").val();
    const day = $("#startDay").val();
    $dateInput = new Date(year, month, day);
    loadData();
  });
});
