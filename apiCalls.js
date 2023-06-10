/* eslint-disable no-undef*/

const datum = "MLLW";
const stationId = "8722557";
const apitimezone = "lst_ldt";
const apiunits = "english";
const apiInterval = "hilo";

const handleError = () => {
  const errorDisplay = $("<div/>", {
    class: "error",
    text: "No tide predictions data available."
  });
  errorDisplay.appendTo("#tidePredictions");
};

const loadData = () => {
  $(".loaderContainer").show();
  $("#predictionsTable").remove();

  const beginDate = $dateInput.toISOString().slice(0, 10).replace(/-/g, "");
  let twoWeeksOut = new Date($dateInput);
  twoWeeksOut.setDate($dateInput.getDate() + 14);
  const endDate = twoWeeksOut.toISOString().slice(0, 10).replace(/-/g, "");

  $.getJSON(
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
    {
      product: "predictions",
      begin_date: beginDate,
      end_date: endDate,
      datum: datum,
      station: stationId,
      time_zone: apitimezone,
      units: apiunits,
      interval: apiInterval,
      format: "json",
      application: "Scuba_Network_NYC"
    },
    function (jsondata2) {
      if (jsondata2.predictions) {
        $predictions = jsondata2.predictions;
        makeTable();
      } else {
        handleError();
      }
    }
  )
    .fail(function (jqxhr, textStatus, error) {
      handleError();
    })
    .always(function () {
      $(".loaderContainer").hide();
    });
};
